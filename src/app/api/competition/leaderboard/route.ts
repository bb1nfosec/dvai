import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getRecentScores, getCompetitionStats } from '@/lib/competition-store';
import { validateOrigin } from '@/lib/anti-cheat';

// ─── GET: Fetch competition leaderboard + activity feed ─────────
export async function GET(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeFeed = searchParams.get('feed') === 'true';

    const [leaderboard, stats, recentScores] = await Promise.all([
      getLeaderboard(),
      Promise.resolve(getCompetitionStats()),
      includeFeed ? getRecentScores() : Promise.resolve([]),
    ]);

    return NextResponse.json({
      leaderboard,
      stats,
      recentScores,
    });
  } catch (error) {
    console.error('Competition leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
