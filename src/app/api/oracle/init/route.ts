import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateSecret, getSecretDescription, getDifficultyLabel } from '@/lib/oracle-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_oracle';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

interface OracleCookieState {
  operationId: string;
  secret: string;
  hardeningLevel: number;
  apiCallCount: number;
  apiCallBudget: number;
  startedAt: string;
}

// ─── POST: Initialize OP-ORACLE ───────────────────────────────
// Generates a secret, encrypts it into an HTTP-only cookie.
// Client must supply groqKey (validated server-side before proceeding).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groqKey, hardeningLevel: requestedLevel } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    // Validate the Groq API key before starting
    const isValid = await validateGroqApiKey(groqKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Groq API key' }, { status: 400 });
    }

    const level = requestedLevel || 1;
    const secret = generateSecret(level);
    const operationId = `op_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const oracleState: OracleCookieState = {
      operationId,
      secret,
      hardeningLevel: level,
      apiCallCount: 0,
      apiCallBudget: 10000,
      startedAt: new Date().toISOString(),
    };

    // Encrypt and store in HTTP-only cookie — survives across serverless invocations
    const encrypted = encrypt(JSON.stringify(oracleState));

    const response = NextResponse.json({
      operationId,
      hardeningLevel: level,
      difficultyLabel: getDifficultyLabel(level),
      secretDescription: getSecretDescription(level),
      apiCallBudget: oracleState.apiCallBudget,
      startedAt: oracleState.startedAt,
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
    console.error('Oracle init error:', error);
    return NextResponse.json({ error: 'Failed to initialize operation' }, { status: 500 });
  }
}
