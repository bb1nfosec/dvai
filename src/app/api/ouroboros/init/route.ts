import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateOuroborosState, type TargetLanguage } from '@/lib/ouroboros-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_ouroboros';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-OUROBOROS ───────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groqKey, targetLanguage } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    const isValid = await validateGroqApiKey(groqKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Groq API key' }, { status: 400 });
    }

    const lang: TargetLanguage =
      targetLanguage === 'Spanish' || targetLanguage === 'German'
        ? targetLanguage
        : 'French';

    const state = generateOuroborosState(lang);

    const encrypted = encrypt(JSON.stringify(state));

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-OUROBOROS',
      description: 'Multi-Stage Pipeline Exploitation — exploit a 3-stage AI pipeline to extract a hidden flag',
      targetLanguage: state.targetLanguage,
      apiCallBudget: state.apiCallBudget,
      startedAt: state.startedAt,
      flagHint: `The flag format is: [code-word]-[nato-phonetic]. It must appear in the Analyzer's "CRITICAL FINDING" field.`,
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
    console.error('Ouroboros init error:', error);
    return NextResponse.json({ error: 'Failed to initialize operation' }, { status: 500 });
  }
}
