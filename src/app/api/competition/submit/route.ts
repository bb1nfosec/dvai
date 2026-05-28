import { NextRequest, NextResponse } from 'next/server';
import { submitScore, type CompetitionScoreEntry } from '@/lib/competition-store';
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
    if (!callsign || typeof callsign !== 'string') {
      return NextResponse.json({ error: 'Valid callsign required' }, { status: 400 });
    }
    if (!opCode || typeof opCode !== 'string') {
      return NextResponse.json({ error: 'Valid opCode required' }, { status: 400 });
    }
    if (typeof totalScore !== 'number' || totalScore < 0) {
      return NextResponse.json({ error: 'Valid totalScore required' }, { status: 400 });
    }

    // Rate limiting
    const rateCheck = checkRateLimit('competition-submit', callsign);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    const entry: CompetitionScoreEntry = {
      callsign: callsign.trim().toLowerCase(),
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

    await submitScore(entry);

    return NextResponse.json({
      success: true,
      message: `Score submitted for ${entry.callsign}`,
      entry,
    });
  } catch (error) {
    console.error('Competition submit error:', error);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
