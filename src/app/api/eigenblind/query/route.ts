import { NextRequest, NextResponse } from 'next/server';
import { checkTargetMatch, type EigenblindState, type TestQuestion } from '@/lib/eigenblind-engine';
import { encrypt, decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_eigenblind';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function readCookie(request: NextRequest): EigenblindState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as EigenblindState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: EigenblindState): void {
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
    temperature: 0.7,
    max_tokens: 512,
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

async function testSuffix(
  apiKey: string,
  suffix: string,
  questions: TestQuestion[],
  targetPhrase: string,
): Promise<Array<{
  question: TestQuestion;
  response: string;
  matches: boolean;
  similarity: number;
}>> {
  const results = [];

  for (const q of questions) {
    const prompt = `${q.question}\n\n${suffix}`;
    const messages: GroqMessage[] = [
      { role: 'system', content: 'You are a helpful assistant. Respond concisely and directly to the user question.' },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await callGroq(apiKey, messages);
      const match = checkTargetMatch(result.content, targetPhrase);
      results.push({
        question: q,
        response: result.content,
        matches: match.matches,
        similarity: match.similarity,
      });
    } catch (err) {
      results.push({
        question: q,
        response: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        matches: false,
        similarity: 0,
      });
    }
  }

  return results;
}

// ─── POST: Test a suffix against questions ───────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groqKey, suffix } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }
    if (!suffix || typeof suffix !== 'string') {
      return NextResponse.json({ error: 'suffix required' }, { status: 400 });
    }
    if (suffix.length > 100) {
      return NextResponse.json({ error: 'Suffix exceeds 100 character limit' }, { status: 400 });
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.queryCount >= state.apiCallBudget) {
      return NextResponse.json({ error: 'API call budget exceeded' }, { status: 429 });
    }

    // Test against visible questions (3)
    const results = await testSuffix(groqKey, suffix, state.visibleQuestions, state.targetPhrase);
    state.queryCount += state.visibleQuestions.length;

    const passCount = results.filter(r => r.matches).length;

    const response = NextResponse.json({
      suffix,
      suffixLength: suffix.length,
      targetPhrase: state.targetPhrase,
      results: results.map(r => ({
        questionId: r.question.id,
        question: r.question.question,
        type: r.question.type,
        response: r.response,
        matches: r.matches,
        similarity: Math.round(r.similarity * 100) / 100,
      })),
      summary: {
        tested: results.length,
        passed: passCount,
        passRate: results.length > 0 ? passCount / results.length : 0,
      },
      queryCount: state.queryCount,
      remainingBudget: state.apiCallBudget - state.queryCount,
    });

    setCookie(response, state);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to test suffix';
    console.error('Eigenblind query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
