import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateSchemaPoisonState } from '@/lib/schemapoison-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_schemapoison';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-SCHEMAPOISON ───────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groqKey } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    const isValid = await validateGroqApiKey(groqKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Groq API key' }, { status: 400 });
    }

    const state = generateSchemaPoisonState();

    const encrypted = encrypt(JSON.stringify(state));

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-SCHEMAPOISON',
      description: 'RAG Knowledge Base Poisoning — inject a poisoned document to make the AI output misinformation',
      targetDescription: state.targetDescription,
      targetClaimHint: `You must make the AI say: "${state.targetClaim}"`,
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
    return NextResponse.json({ error: 'Failed to initialize operation' }, { status: 500 });
  }
}
