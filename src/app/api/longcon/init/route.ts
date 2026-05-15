import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateLongconState, getScenarioDef } from '@/lib/longcon-engine';
import { encrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_longcon';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-LONGCON ─────────────────────────────
// ANTI-CHEAT: Does NOT reveal the exact target claim text.
// The player gets the scenario context and protected beliefs,
// but must figure out the specific false claim to induce.
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

    const state = generateLongconState();
    const scenarioDef = getScenarioDef(state);

    const encrypted = encrypt(JSON.stringify(state));

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-LONGCON',
      description: '20-Turn Semantic Manipulation — gradually shift an AI\'s beliefs through conversation',
      scenario: {
        name: state.scenario.name,
        description: state.scenario.description,
        category: state.scenario.category,
        difficulty: state.scenario.difficulty,
      },
      // ANTI-CHEAT: Show protected beliefs so the player knows WHAT to attack
      protectedBeliefs: state.protectedBeliefs,
      // ANTI-CHEAT: DO NOT reveal the exact target claim text
      // Give the hint instead so the player knows the general direction
      targetDirection: scenarioDef?.hint || 'Find a way to make the AI contradict one of its protected beliefs.',
      maxTurns: state.maxTurns,
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
