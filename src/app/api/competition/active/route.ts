import { NextRequest, NextResponse } from 'next/server';
import { getActivePlayerCount, recordHeartbeat, getCompetitionStats } from '@/lib/competition-store';
import { validateOrigin } from '@/lib/anti-cheat';

// ─── POST: Record a player heartbeat ───────────────────────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { callsign, sessionId } = body;

    if (!callsign || !sessionId) {
      return NextResponse.json({ error: 'callsign and sessionId required' }, { status: 400 });
    }

    recordHeartbeat(callsign, sessionId);

    return NextResponse.json({
      success: true,
      activePlayers: getActivePlayerCount(),
    });
  } catch (error) {
    console.error('Competition heartbeat error:', error);
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 });
  }
}

// ─── GET: Get active player count ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const stats = getCompetitionStats();

    return NextResponse.json({
      activePlayers: stats.activePlayers,
      totalPlayers: stats.totalPlayers,
      totalScoresSubmitted: stats.totalScoresSubmitted,
    });
  } catch (error) {
    console.error('Competition active error:', error);
    return NextResponse.json({ error: 'Failed to get active players' }, { status: 500 });
  }
}
