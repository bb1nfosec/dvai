import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateOuroborosState, buildPipelineOverview } from '@/lib/ouroboros-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_ouroboros';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-OUROBOROS ─────────────────────────
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

    const state = generateOuroborosState();
    const encrypted = encrypt(JSON.stringify(state));

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-OUROBOROS',
      description: 'Multi-Stage Pipeline Exploitation — figure out hidden criteria and pass all 3 stages',
      pipeline: buildPipelineOverview(state),
      stages: state.stages.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
      })),
      apiCallBudget: state.apiCallBudget,
      startedAt: state.startedAt,
      rules: [
        'You are interacting with a 3-stage pipeline: Planner → Validator → Executor',
        'Each stage has HIDDEN acceptance criteria you must discover through feedback',
        'Submit a plan to test it against all 3 stages simultaneously',
        'Learn from the feedback to refine your approach',
        'Submit your final plan when you think it will pass all 3 stages',
      ],
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
