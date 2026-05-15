import { NextRequest, NextResponse } from 'next/server';
import {
  buildMutationHardenedPrompt,
  checkAndApplyMutation,
  type CartesianState,
} from '@/lib/cartesian-engine';
import { encrypt, decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_cartesian';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function readCookie(request: NextRequest): CartesianState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as CartesianState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: CartesianState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
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

async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  withLogprobs: boolean,
): Promise<GroqChatResponse> {
  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
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

// ─── POST: Query the hardened model ─────────────────────
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

    const state = readCookie(request);
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

    // Build hardened system prompt based on current mutation level
    const systemPrompt = buildMutationHardenedPrompt(state.secret, state.currentMutationLevel);
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    // Try with logprobs; fall back to without
    let response: GroqChatResponse;
    let logprobsFallback = false;
    try {
      response = await callGroq(groqKey, groqMessages, true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('logprobs')) {
        response = await callGroq(groqKey, groqMessages, false);
        logprobsFallback = true;
      } else {
        throw err;
      }
    }

    // Increment call counter
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
      currentMutationLevel: state.currentMutationLevel,
      ...(logprobsFallback ? { _logprobsNote: 'Model does not support logprobs' } : {}),
    });

    setCookie(jsonResponse, state);
    return jsonResponse;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query hardened model';
    console.error('Cartesian query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
