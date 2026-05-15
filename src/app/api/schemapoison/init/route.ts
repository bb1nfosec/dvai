import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateSchemaPoisonState } from '@/lib/schemapoison-engine';
import { encrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_schemapoison';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-SCHEMAPOISON ───────────────────────
// ANTI-CHEAT: Does NOT reveal the target claim to the client.
// The player must discover it by querying the knowledge base.
export async function POST(request: NextRequest) {
  try {
    // Origin validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    const isValid = await validateGroqApiKey(groqKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Groq API key' }, { status: 400 });
    }

    // ANTI-CHEAT: Rate limit init
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('init', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many initialization attempts. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    const state = generateSchemaPoisonState();

    const encrypted = encrypt(JSON.stringify(state));

    // ANTI-CHEAT: DO NOT reveal the target claim or exact description
    // Instead, give a thematic hint about what AREA to poison
    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-SCHEMAPOISON',
      description: 'RAG Knowledge Base Poisoning — inject a poisoned document to make the AI output misinformation',
      // ANTI-CHEAT: Vague thematic hint — NOT the exact claim
      targetArea: state.targetDescription.replace(/^Make the AI say: "/, '').replace(/"$/, '').split(' ').slice(0, 3).join(' ') + '...',
      // ANTI-CHEAT: Replaced exact targetClaimHint with thematic guidance
      missionBriefing: 'Your objective is to inject a document into the knowledge base that causes the RAG system to output factually incorrect information. Study the knowledge base documents to identify factual claims you can contradict. The target is a specific false statement — you must discover what it is by understanding the KB content.',
      knowledgeBaseSize: state.kbDocuments.length,
      knowledgeBaseTitles: state.kbDocuments.map(d => d.title),
      queryBudget: state.queryBudget,
      startedAt: state.startedAt,
      phases: {
        current: 'inject',
        description: 'Submit a poisoned document that contradicts a factual claim in the knowledge base.',
      },
    });

    response.cookies.set(COOKIE_NAME, encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('SchemaPoison init error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initialize operation. Try refreshing the page and try again.', debug: process.env.NODE_ENV !== 'production' ? msg : undefined },
      { status: 500 }
    );
  }
}
