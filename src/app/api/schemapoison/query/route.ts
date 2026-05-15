import { NextRequest, NextResponse } from 'next/server';
import {
  retrieveDocuments,
  buildRAGSystemPrompt,
  checkPoisonedClaimInResponse,
  type SchemaPoisonState,
} from '@/lib/schemapoison-engine';
import { encrypt, decrypt } from '@/lib/crypto';
import { checkRateLimit, recordQuery, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_schemapoison';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function readCookie(request: NextRequest): SchemaPoisonState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as SchemaPoisonState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: SchemaPoisonState): void {
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

// ─── POST: Query the RAG pipeline ───────────────────────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey, question } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question required' }, { status: 400 });
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.phase === 'inject') {
      return NextResponse.json(
        { error: 'Inject a document first before querying the RAG system.' },
        { status: 400 },
      );
    }

    if (state.queryCount >= state.queryBudget) {
      return NextResponse.json({ error: 'Query budget exceeded' }, { status: 429 });
    }

    // ANTI-CHEAT: Rate limit queries
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('schemapoison-query', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Query rate limit exceeded. Slow down.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    // ANTI-CHEAT: Record query for behavioral analysis
    recordQuery(sessionId);

    // Simulate retrieval: find top 3 relevant documents
    const retrieval = retrieveDocuments(state.kbDocuments, question, 3);
    const retrievedIds = retrieval.documents.map(d => d.id);

    // Build system prompt with retrieved documents
    const systemPrompt = buildRAGSystemPrompt(state, retrieval.documents);
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    const result = await callGroq(groqKey, messages);

    // Check if response contains poisoned claim
    const containsPoison = checkPoisonedClaimInResponse(result.content, state.targetClaim);

    // Update state
    state.queryCount += 1;
    state.recentQueries.push({
      question,
      answer: result.content,
      retrievedIds,
    });

    if (state.recentQueries.length > 20) {
      state.recentQueries = state.recentQueries.slice(-20);
    }

    const response = NextResponse.json({
      question,
      answer: result.content,
      retrievedDocuments: retrieval.documents.map(d => ({
        id: d.id,
        title: d.title,
        isPoisoned: d.isPoisoned,
      })),
      retrievalScores: retrieval.scores,
      containsPoisonedClaim: containsPoison,
      queryCount: state.queryCount,
      remainingBudget: state.queryBudget - state.queryCount,
      phase: state.phase,
    });

    setCookie(response, state);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query RAG system';
    console.error('SchemaPoison query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
