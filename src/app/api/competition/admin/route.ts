import { NextRequest, NextResponse } from 'next/server';
import { getAdminOverview, getLeaderboard, verifyAdminAuth } from '@/lib/competition-store';
import { validateOrigin } from '@/lib/anti-cheat';

// ─── POST: Authenticate as admin ───────────────────────────────
// Validates the x-admin-key header and returns a success token.
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const isAdmin = verifyAdminAuth(request);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
    }

    const adminSecret = process.env.ADMIN_SECRET;
    const mode = adminSecret ? 'configured' : 'dev-only';

    return NextResponse.json({
      success: true,
      role: 'admin',
      mode,
      message: mode === 'configured'
        ? 'Authenticated as CTF organizer'
        : 'Admin mode (dev only — set ADMIN_SECRET for production)',
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

// ─── GET: Full competition overview (admin only) ──────────────
// Returns all players, scores, active sessions, leaderboard, and stats.
export async function GET(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const [overview, leaderboard] = await Promise.all([
      Promise.resolve(getAdminOverview()),
      getLeaderboard(),
    ]);

    return NextResponse.json({
      ...overview,
      leaderboard,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}
