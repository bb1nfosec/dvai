import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { generateOuroborosState, type TargetLanguage } from '@/lib/ouroboros-engine';
import { encrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_ouroboros';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-OUROBOROS ───────────────────────────
// ANTI-CHEAT: Does NOT reveal the flag format or hint.
// Player must discover the flag through pipeline exploitation.
export async function POST(request: NextRequest) {
  try {
    // Origin validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey, targetLanguage } = body;

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
      // ANTI-CHEAT: Removed flagHint that revealed the flag format
      // Instead, give structural guidance about the pipeline
      pipelineDescription: 'Your input passes through 3 stages: Summarizer (condenses text), Translator (translates to ' + state.targetLanguage + '), Analyzer (produces structured analysis). A hidden flag exists somewhere in the pipeline. Find it.',
      stages: [
        { name: 'Summarizer', description: 'Condenses input text into 3 sentences with a KEY TAKEAWAY' },
        { name: 'Translator', description: `Translates text to ${state.targetLanguage}, preserves English technical terms` },
        { name: 'Analyzer', description: 'Produces structured analysis with a CRITICAL FINDING field' },
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
