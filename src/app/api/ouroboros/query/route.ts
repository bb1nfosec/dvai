import { NextRequest, NextResponse } from 'next/server';
import {
  buildSummarizerPrompt,
  buildTranslatorPrompt,
  buildAnalyzerPrompt,
  checkFlagInAnalyzerOutput,
  type OuroborosState,
  type TargetLanguage,
} from '@/lib/ouroboros-engine';
import { encrypt, decrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin, recordQuery } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_ouroboros';
const COOKIE_MAX_AGE = 60 * 60 * 24;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function readCookie(request: NextRequest): OuroborosState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as OuroborosState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: OuroborosState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callGroq(apiKey: string, messages: GroqMessage[], temperature = 0.7, maxTokens = 1024): Promise<string> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── POST: Run input through 3-stage pipeline (alias) ─────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey, input } = body;

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input text required' }, { status: 400 });
    }

    if (input.trim().length < 10) {
      return NextResponse.json({ error: 'Input must be at least 10 characters' }, { status: 400 });
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.apiCallCount >= state.apiCallBudget) {
      return NextResponse.json({ error: 'API call budget exceeded' }, { status: 429 });
    }

    // ANTI-CHEAT: Rate limit
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('ouroboros-query', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }
    recordQuery(sessionId);

    // Stage 1: Summarizer
    const summarizerPrompt = buildSummarizerPrompt(input.trim());
    const summaryOutput = await callGroq(groqKey, [
      { role: 'system', content: 'You are a text summarizer. Follow all instructions precisely.' },
      { role: 'user', content: summarizerPrompt },
    ], 0.3, 512);

    // Stage 2: Translator
    const translatorPrompt = buildTranslatorPrompt(summaryOutput, state.targetLanguage as import('@/lib/ouroboros-engine').TargetLanguage);
    const translatedOutput = await callGroq(groqKey, [
      { role: 'system', content: `You are a translation engine. Translate to ${state.targetLanguage}. Follow all instructions precisely.` },
      { role: 'user', content: translatorPrompt },
    ], 0.3, 512);

    // Stage 3: Analyzer
    const analyzerPrompt = buildAnalyzerPrompt(translatedOutput);
    const analyzerOutput = await callGroq(groqKey, [
      { role: 'system', content: 'You are a sentiment and content analyzer. Follow the output format exactly.' },
      { role: 'user', content: analyzerPrompt },
    ], 0.3, 512);

    // Check if flag appears in analyzer output
    const hasFlag = checkFlagInAnalyzerOutput(analyzerOutput, state.flag);

    // Update state
    state.apiCallCount += 3;
    const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    state.pipelineRuns.push({
      id: runId,
      input: input.trim(),
      stages: {
        summarizer: summaryOutput,
        translator: translatedOutput,
        analyzer: analyzerOutput,
      },
      hasFlag,
    });

    if (state.pipelineRuns.length > 20) {
      state.pipelineRuns = state.pipelineRuns.slice(-20);
    }

    if (hasFlag && !state.solvedAt) {
      state.solvedAt = new Date().toISOString();
    }

    const response = NextResponse.json({
      runId,
      stages: {
        summarizer: summaryOutput,
        translator: translatedOutput,
        analyzer: analyzerOutput,
      },
      hasFlag,
      apiCallCount: state.apiCallCount,
      remainingBudget: state.apiCallBudget - state.apiCallCount,
      totalRuns: state.pipelineRuns.length,
      targetLanguage: state.targetLanguage,
    });

    setCookie(response, state);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to run pipeline';
    console.error('Ouroboros query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
