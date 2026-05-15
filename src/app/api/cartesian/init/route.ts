import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateCartesianState, getSecretDescription, MUTATION_LAYERS } from '@/lib/cartesian-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_cartesian';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-CARTESIAN ───────────────────────
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

    const state = generateCartesianState();

    const encrypted = encrypt(JSON.stringify(state));

    const activeLayers = MUTATION_LAYERS.filter(l => l.level <= state.currentMutationLevel);

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-CARTESIAN',
      description: 'Mutation Engine Bypass — extract a secret from a maximally hardened AI system prompt',
      secretDescription: getSecretDescription(),
      apiCallBudget: state.apiCallBudget,
      mutationThreshold: state.mutationThreshold,
      maxMutationLevel: state.maxMutationLevel,
      initialMutationLevel: state.currentMutationLevel,
      activeLayers: activeLayers.map(l => ({ level: l.level, name: l.name, description: l.description })),
      allLayers: MUTATION_LAYERS.map(l => ({ level: l.level, name: l.name, description: l.description })),
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
    console.error('Cartesian init error:', error);
    return NextResponse.json({ error: 'Failed to initialize operation' }, { status: 500 });
  }
}
