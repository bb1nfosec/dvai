import { NextRequest, NextResponse } from 'next/server';
import { queryGroq, type GroqMessage } from '@/lib/groq';
import { buildOracleSystemPrompt } from '@/lib/oracle-engine';
import { encrypt, decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_oracle';
const COOKIE_MAX_AGE = 60 * 60 * 24;

interface OracleCookieState {
  operationId: string;
  secret: string;
  hardeningLevel: number;
  apiCallCount: number;
  apiCallBudget: number;
  startedAt: string;
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

// ─── POST: Query the oracle ───────────────────────────────────
// Client sends groqKey + message. Server reads secret from cookie, builds
// system prompt, proxies to Groq, increments call counter in cookie.
export async function POST(request: NextRequest) {
  try {
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

    // Build system prompt with the decrypted secret
    const systemPrompt = buildOracleSystemPrompt(state.secret, state.hardeningLevel);
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    const response = await queryGroq(groqKey, groqMessages, {
      logprobs: true,
      topLogprobs: 10,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Increment call counter and re-encrypt cookie
    state.apiCallCount += 1;
    const newCallCount = state.apiCallCount;
    const choice = response.choices[0];
    const logprobs = choice?.logprobs?.content || null;

    const jsonResponse = NextResponse.json({
      id: response.id,
      content: choice?.message?.content || '',
      logprobs,
      model: response.model,
      usage: response.usage,
      apiCallCount: newCallCount,
      apiCallBudget: state.apiCallBudget,
      remainingBudget: state.apiCallBudget - newCallCount,
    });

    setOracleCookie(jsonResponse, state);
    return jsonResponse;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query oracle';
    console.error('Oracle query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
