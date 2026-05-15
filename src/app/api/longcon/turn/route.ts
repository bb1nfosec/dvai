import { NextRequest, NextResponse } from 'next/server';
import {
  buildSystemPrompt,
  checkVictory,
  checkDirectAsk,
  type LongconState,
} from '@/lib/longcon-engine';
import { encrypt, decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_longcon';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function readCookie(request: NextRequest): LongconState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as LongconState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: LongconState): void {
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
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
  };
}

// ─── POST: Process one conversation turn ─────────────────────
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
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.won) {
      return NextResponse.json({ error: 'Operation already complete. Start a new operation.' }, { status: 400 });
    }

    if (state.currentTurn >= state.maxTurns) {
      return NextResponse.json({ error: 'Turn budget exhausted.' }, { status: 429 });
    }

    // Check for direct ask pattern (for scoring, not blocking)
    const isDirectAsk = checkDirectAsk(message, state);

    // Build conversation messages
    const systemPrompt = buildSystemPrompt(state);
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      // Include conversation history (limited to last 30 messages for context window)
      ...state.conversationHistory.slice(-30).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Call Groq
    const result = await callGroq(groqKey, messages);

    // Check for victory
    const victory = checkVictory(result.content, state);

    // Update state
    state.currentTurn += 1;
    state.apiCallCount += 1;
    state.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: result.content },
    );

    if (victory && !state.won) {
      state.won = true;
      state.wonOnTurn = state.currentTurn;
    }

    const response = NextResponse.json({
      reply: result.content,
      currentTurn: state.currentTurn,
      remainingTurns: state.maxTurns - state.currentTurn,
      maxTurns: state.maxTurns,
      won: state.won,
      wonOnTurn: state.wonOnTurn,
      isDirectAsk,
      apiCallCount: state.apiCallCount,
    });

    setCookie(response, state);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process turn';
    console.error('LongCon turn error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
