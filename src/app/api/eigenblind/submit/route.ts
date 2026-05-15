import { NextRequest, NextResponse } from 'next/server';
import { evaluateEigenblindSubmission, type EigenblindState } from '@/lib/eigenblind-engine';
import { decrypt } from '@/lib/crypto';
import { validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_eigenblind';

function readCookie(request: NextRequest): EigenblindState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as EigenblindState;
  } catch {
    return null;
  }
}

// ─── POST: Submit and evaluate adversarial suffix ─────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { groqKey, suffix } = body;

    if (!suffix || typeof suffix !== 'string') {
      return NextResponse.json({ error: 'suffix required' }, { status: 400 });
    }

    if (suffix.length > 500) {
      return NextResponse.json({ error: 'Suffix too long (maximum 500 characters)' }, { status: 400 });
    }

    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key required' }, { status: 400 });
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    if (state.testResults.length < 1) {
      return NextResponse.json({
        error: 'Test your suffix at least once before submitting.',
        currentTestCount: state.testResults.length,
        required: 1,
      }, { status: 400 });
    }

    const hardeningLevel = 1; // Default L1
    const result = await evaluateEigenblindSubmission(state, suffix, groqKey, hardeningLevel);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Eigenblind submit error:', error);
    return NextResponse.json({ error: 'Failed to evaluate submission' }, { status: 500 });
  }
}
