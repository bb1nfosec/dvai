import { NextRequest, NextResponse } from 'next/server';
import { resetCompetition, verifyAdminAuth } from '@/lib/competition-store';
import { validateOrigin } from '@/lib/anti-cheat';

// ─── POST: Reset the entire competition ────────────────────────
// Admin operation — requires x-admin-key header matching ADMIN_SECRET env var.
// Clears all scores, players, and active sessions (both in-memory and KV).
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // Require admin authentication
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Authentication required. Provide a valid x-admin-key header.' },
        { status: 401 },
      );
    }

    await resetCompetition();

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
