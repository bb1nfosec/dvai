import { NextRequest, NextResponse } from 'next/server';
import {
  getClassificationPrompt,
  getClassificationClasses,
  parseClassification,
  type EigenblindState,
} from '@/lib/eigenblind-engine';
import { encrypt, decrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin, recordQuery } from '@/lib/anti-cheat';

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

// ─── POST: Classify text with adversarial suffix ───────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey, suffix } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    if (!suffix || typeof suffix !== 'string') {
      return NextResponse.json({ error: 'suffix required' }, { status: 400 });
    }

    if (suffix.length > 500) {
      return NextResponse.json({ error: 'Suffix too long (maximum 500 characters)' }, { status: 400 });
    }

    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('eigenblind-classify', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }
    recordQuery(sessionId);

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.apiCallCount >= state.apiCallBudget) {
      return NextResponse.json({ error: 'API call budget exceeded' }, { status: 429 });
    }

    // Build the full text with suffix appended
    const fullText = state.targetInput + ' ' + suffix;
    const systemPrompt = getClassificationPrompt(state.taskType);
    const classes = getClassificationClasses(state.taskType);

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: fullText },
    ];

    // Call Groq with logprobs
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 10,
        logprobs: true,
        top_logprobs: 5,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const logprobsData = data.choices?.[0]?.logprobs?.content || [];

    // Extract top logprobs for the classification token
    const topLogprobs: Array<{ token: string; logprob: number }> = [];
    for (const tokenEntry of logprobsData) {
      if (tokenEntry.top_logprobs) {
        for (const lp of tokenEntry.top_logprobs) {
          const cleanToken = lp.token.trim().toUpperCase();
          if (classes.some(c => cleanToken.includes(c))) {
            topLogprobs.push({ token: lp.token, logprob: lp.logprob });
          }
        }
      }
      if (topLogprobs.length >= 5) break;
    }

    // Parse classification
    const parsed = parseClassification(content, state.taskType);
    const isMisclassification = parsed.classification === state.targetClassification;

    // Update state
    state.apiCallCount += 1;
    state.testResults.push({
      text: fullText,
      suffix,
      classified: parsed.classification,
      confidence: parsed.confidence,
      topLogprobs,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 results
    if (state.testResults.length > 50) {
      state.testResults = state.testResults.slice(-50);
    }

    const response = NextResponse.json({
      targetInput: state.targetInput,
      suffix,
      fullText,
      classified: parsed.classification,
      expectedMisclassification: state.targetClassification,
      correctClassification: state.correctClassification,
      isMisclassification,
      confidence: parsed.confidence,
      topLogprobs,
      apiCallCount: state.apiCallCount,
      remainingBudget: state.apiCallBudget - state.apiCallCount,
      taskType: state.taskType,
    });

    setCookie(response, state);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to classify text';
    console.error('Eigenblind classify error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
