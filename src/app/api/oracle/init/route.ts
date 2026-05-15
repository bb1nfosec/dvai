import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateSecret, getSecretDescription, getDifficultyLabel } from '@/lib/oracle-engine';
import { encrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_oracle';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

interface OracleCookieState {
  operationId: string;
  secret: string;
  hardeningLevel: number;
  apiCallCount: number;
  apiCallBudget: number;
  guessHistory: string[];
  startedAt: string;
}

// ─── POST: Initialize OP-ORACLE ───────────────────────────────
// ANTI-CHEAT: Clamps hardening level server-side, never leaks secret format
export async function POST(request: NextRequest) {
  try {
    // Origin validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

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

    // ANTI-CHEAT: Rate limit init
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('init', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many initialization attempts. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    // ANTI-CHEAT: Clamp hardening level server-side (1-6)
    const level = Math.max(1, Math.min(6, Math.floor(requestedLevel) || 1));
    const secret = generateSecret(level);
    const operationId = `op_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const oracleState: OracleCookieState = {
      operationId,
      secret,
      hardeningLevel: level,
      apiCallCount: 0,
      apiCallBudget: 10000,
      guessHistory: [],
      startedAt: new Date().toISOString(),
    };

    // Encrypt and store in HTTP-only cookie
    const encrypted = encrypt(JSON.stringify(oracleState));

    const response = NextResponse.json({
      operationId,
      hardeningLevel: level,
      difficultyLabel: getDifficultyLabel(level),
      // ANTI-CHEAT: Vague description — never reveals charset, length, or exact format
      secretDescription: getSecretDescription(level),
      apiCallBudget: oracleState.apiCallBudget,
      startedAt: oracleState.startedAt,
      blindMode: level >= 6,
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
