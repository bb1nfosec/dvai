import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateLongconState, getScenarioDef } from '@/lib/longcon-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_longcon';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-LONGCON ─────────────────────────────
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

    const state = generateLongconState();
    const scenarioDef = getScenarioDef(state);

    const encrypted = encrypt(JSON.stringify(state));

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-LONGCON',
      description: '20-Turn Semantic Manipulation — gradually shift an AI\'s beliefs through conversation',
      scenario: state.scenario,
      protectedBeliefs: state.protectedBeliefs,
      targetClaim: state.targetClaim,
      targetDescription: `You must get the AI to say: "${state.targetClaim}"`,
      maxTurns: state.maxTurns,
      hint: scenarioDef?.hint || null,
      startedAt: state.startedAt,
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
    console.error('LongCon init error:', error);
    return NextResponse.json({ error: 'Failed to initialize operation' }, { status: 500 });
  }
}
