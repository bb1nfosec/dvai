import { NextRequest, NextResponse } from 'next/server';
import { resetCompetition } from '@/lib/competition-store';
import { validateOrigin } from '@/lib/anti-cheat';

// ─── POST: Reset the entire competition ────────────────────────
// Admin operation — clears all scores, players, and active sessions.
// Useful for restarting a BSides village event between sessions.
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    resetCompetition();

    return NextResponse.json({
      success: true,
      message: 'Competition has been reset. All scores, players, and sessions cleared.',
      resetAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Competition reset error:', error);
    return NextResponse.json({ error: 'Failed to reset competition' }, { status: 500 });
  }
}
