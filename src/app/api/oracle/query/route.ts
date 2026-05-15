import { NextRequest, NextResponse } from 'next/server';
import { buildOracleSystemPrompt, isBlindMode } from '@/lib/oracle-engine';
import { encrypt, decrypt } from '@/lib/crypto';
import { checkRateLimit, recordQuery, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_oracle';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

interface OracleCookieState {
  operationId: string;
  secret: string;
  hardeningLevel: number;
  apiCallCount: number;
  apiCallBudget: number;
  guessHistory: string[];
  startedAt: string;
}

interface GroqLogprobToken {
  token: string;
  logprob: number;
  top_logprobs: Array<{ token: string; logprob: number }>;
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    logprobs: { content: GroqLogprobToken[] } | null;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function readOracleCookie(request: NextRequest): OracleCookieState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as OracleCookieState;
  } catch {
    return null;
  }
}

function setOracleCookie(response: NextResponse, state: OracleCookieState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  withLogprobs: boolean,
  maxTokens?: number,
): Promise<GroqChatResponse> {
  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens || 1024,
  };

  if (withLogprobs) {
    body.logprobs = true;
    body.top_logprobs = 10;
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  return res.json();
}

// ─── POST: Query the oracle ───────────────────────────────────
// ANTI-CHEAT: L6 BLIND MODE strips text, max_tokens:1, logprobs only
export async function POST(request: NextRequest) {
  try {
    // Origin validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey, message } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const state = readOracleCookie(request);
    if (!state) {
      return NextResponse.json(
        { error: 'No active operation. Initialize first.' },
        { status: 400 },
      );
    }

    if (state.apiCallCount >= state.apiCallBudget) {
      return NextResponse.json(
        {
          error: 'API call budget exceeded',
          apiCallCount: state.apiCallCount,
          apiCallBudget: state.apiCallBudget,
        },
        { status: 429 },
      );
    }

    // ANTI-CHEAT: Rate limit queries
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('oracle-query', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Query rate limit exceeded. Slow down.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    // ANTI-CHEAT: Record query for behavioral analysis
    recordQuery(sessionId);

    // Build system prompt with the decrypted secret
    const systemPrompt = buildOracleSystemPrompt(state.secret, state.hardeningLevel);
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    const blindMode = isBlindMode(state.hardeningLevel);

    // L6 BLIND MODE: max_tokens:1, logprobs only, strip text
    let response: GroqChatResponse;
    let logprobsFallback = false;
    try {
      response = await callGroq(groqKey, groqMessages, true, blindMode ? 1 : 1024);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('logprobs')) {
        response = await callGroq(groqKey, groqMessages, false, blindMode ? 1 : 1024);
        logprobsFallback = true;
      } else {
        throw err;
      }
    }

    // Increment call counter and re-encrypt cookie
    state.apiCallCount += 1;
    const newCallCount = state.apiCallCount;
    const choice = response.choices[0];
    const logprobs = choice?.logprobs?.content || null;

    const jsonResponse = NextResponse.json({
      id: response.id,
      // ANTI-CHEAT: In blind mode, strip text content entirely
      content: blindMode ? '[BLIND MODE — text response stripped]' : (choice?.message?.content || ''),
      logprobs,
      model: response.model,
      usage: response.usage,
      apiCallCount: newCallCount,
      apiCallBudget: state.apiCallBudget,
      remainingBudget: state.apiCallBudget - newCallCount,
      blindMode,
      ...(logprobsFallback ? { _logprobsNote: 'Model does not support logprobs; response returned without logprob data' } : {}),
    });

    setOracleCookie(jsonResponse, state);
    return jsonResponse;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query oracle';
    // ANTI-CHEAT: Don't leak API key details in error messages
    console.error('Oracle query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
