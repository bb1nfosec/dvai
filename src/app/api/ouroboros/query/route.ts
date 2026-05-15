import { NextRequest, NextResponse } from 'next/server';
import { parseStageResult, type OuroborosState, type StageResult } from '@/lib/ouroboros-engine';
import { encrypt, decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_ouroboros';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function readCookie(request: NextRequest): OuroborosState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as OuroborosState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: OuroborosState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callGroq(apiKey: string, messages: GroqMessage[]): Promise<{ content: string }> {
  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages,
    temperature: 0.6,
    max_tokens: 768,
    logprobs: true,
    top_logprobs: 10,
  };

  let res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('logprobs')) {
      body.logprobs = undefined;
      body.top_logprobs = undefined;
      res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const retryErr = await res.text();
        throw new Error(`Groq API error (${res.status}): ${retryErr}`);
      }
    } else {
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
  };
}

// ─── POST: Run a plan through the pipeline ───────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groqKey, plan } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }
    if (!plan || typeof plan !== 'string') {
      return NextResponse.json({ error: 'plan required' }, { status: 400 });
    }
    if (plan.length > 3000) {
      return NextResponse.json({ error: 'Plan too long (max 3000 characters)' }, { status: 400 });
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.queryCount >= state.apiCallBudget) {
      return NextResponse.json({ error: 'API call budget exceeded' }, { status: 429 });
    }

    // Run plan through each stage sequentially
    const stageResults: StageResult[] = [];

    for (const stage of state.stages) {
      const messages: GroqMessage[] = [
        { role: 'system', content: stage.systemPrompt },
        { role: 'user', content: `Please evaluate the following plan:\n\n---\n${plan}\n---` },
      ];

      try {
        const result = await callGroq(groqKey, messages);
        const parsed = parseStageResult(result.content);
        stageResults.push({
          stageId: stage.id,
          stageName: stage.name,
          passed: parsed.passed,
          feedback: parsed.feedback,
        });
      } catch (err) {
        stageResults.push({
          stageId: stage.id,
          stageName: stage.name,
          passed: false,
          feedback: `Stage evaluation error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    state.queryCount += state.stages.length;
    const allPassed = stageResults.every(r => r.passed);

    const response = NextResponse.json({
      plan,
      pipelineResults: stageResults.map(r => ({
        stageId: r.stageId,
        stageName: r.stageName,
        passed: r.passed,
        feedback: r.feedback,
      })),
      summary: {
        stagesPassed: stageResults.filter(r => r.passed).length,
        totalStages: stageResults.length,
        allPassed,
      },
      queryCount: state.queryCount,
      remainingBudget: state.apiCallBudget - state.queryCount,
    });

    setCookie(response, state);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process pipeline';
    console.error('Ouroboros query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
