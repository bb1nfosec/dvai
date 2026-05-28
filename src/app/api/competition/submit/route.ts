import { NextRequest, NextResponse } from 'next/server';
import { submitScore, isDuplicateSubmission, isValidOpCode, isValidOperationId, type CompetitionScoreEntry } from '@/lib/competition-store';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';

// ─── POST: Submit a score from a solved operation ──────────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { callsign, operationId, opCode, totalScore, efficiencyScore, anomalySignals, timeToSolve, hardeningLevel } = body as CompetitionScoreEntry;

    // Validate required fields
    if (!callsign || typeof callsign !== 'string' || callsign.trim().length < 2) {
      return NextResponse.json({ error: 'Valid callsign required (min 2 chars)' }, { status: 400 });
    }
    if (!operationId || typeof operationId !== 'string') {
      return NextResponse.json({ error: 'operationId required' }, { status: 400 });
    }
    if (!opCode || typeof opCode !== 'string' || !isValidOpCode(opCode)) {
      return NextResponse.json({ error: 'Valid opCode required (OP-ORACLE, OP-SCHEMAPOISON, etc.)' }, { status: 400 });
    }
    if (typeof totalScore !== 'number' || totalScore < 0 || totalScore > 10000) {
      return NextResponse.json({ error: 'Valid totalScore required (0-10000)' }, { status: 400 });
    }

    // Validate operationId format
    if (!isValidOperationId(operationId)) {
      return NextResponse.json({ error: 'Invalid operationId format' }, { status: 400 });
    }

    // Server-side dedup check before rate limiting
    const normalizedCallsign = callsign.trim().toLowerCase();
    if (isDuplicateSubmission(normalizedCallsign, operationId)) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: `Score already submitted for ${normalizedCallsign} on this operation`,
      });
    }

    // Rate limiting — use sessionId from cookie for better rate isolation
    const rateSessionId = request.cookies.get('dvai_session')?.value || normalizedCallsign;
    const rateCheck = checkRateLimit('competition-submit', rateSessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    const entry: CompetitionScoreEntry = {
      callsign: normalizedCallsign,
      operationId,
      opCode: opCode as CompetitionScoreEntry['opCode'],
      totalScore,
      efficiencyScore: efficiencyScore ?? 0,
      anomalySignals: anomalySignals ?? 0,
      timeToSolve: timeToSolve ?? 0,
      hardeningLevel: hardeningLevel ?? 1,
      solvedAt: new Date().toISOString(),
      techniqueNovelty: false,
    };

    const result = await submitScore(entry);

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      message: result.duplicate
        ? `Duplicate submission for ${entry.callsign} — already scored`
        : `Score submitted for ${entry.callsign}`,
      entry,
    });
  } catch (error) {
    console.error('Competition submit error:', error);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
