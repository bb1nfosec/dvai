import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';
import { generateEigenblindState, getClassificationPrompt, getClassificationClasses, type TaskType } from '@/lib/eigenblind-engine';
import { encrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_eigenblind';
const COOKIE_MAX_AGE = 60 * 60 * 24;

// ─── POST: Initialize OP-EIGENBLIND ────────────────────────
export async function POST(request: NextRequest) {
  try {
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

    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('init', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    const state = generateEigenblindState();

    const encrypted = encrypt(JSON.stringify(state));

    const taskDescriptions: Record<TaskType, string> = {
      sentiment: 'Sentiment Analysis — classify reviews as POSITIVE / NEGATIVE / NEUTRAL',
      toxicity: 'Toxicity Detection — classify comments as SAFE / TOXIC',
      spam: 'Spam Detection — classify messages as HAM / SPAM',
    };

    const response = NextResponse.json({
      operationId: state.operationId,
      challenge: 'OP-EIGENBLIND',
      description: 'Adversarial Suffix Optimization — craft a text suffix that causes a classifier to misclassify input',
      taskType: state.taskType,
      taskDescription: taskDescriptions[state.taskType],
      classificationClasses: getClassificationClasses(state.taskType),
      targetInput: state.targetInput,
      targetInputCategory: state.targetInputCategory,
      targetClassification: state.targetClassification,
      correctClassification: state.correctClassification,
      apiCallBudget: state.apiCallBudget,
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
    console.error('Eigenblind init error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initialize operation. Try refreshing the page and try again.', debug: process.env.NODE_ENV !== 'production' ? msg : undefined },
      { status: 500 }
    );
  }
}
