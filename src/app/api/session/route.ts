import { NextRequest, NextResponse } from 'next/server';
import { validateGroqApiKey } from '@/lib/groq';

// ─── POST: Create new player session (stateless) ──────────────
// No server-side storage. Client stores session in Zustand + localStorage.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callsign } = body;

    if (!callsign || typeof callsign !== 'string' || callsign.trim().length < 2) {
      return NextResponse.json(
        { error: 'Callsign must be at least 2 characters' },
        { status: 400 },
      );
    }

    const normalized = callsign.trim().toLowerCase().replace(/\s+/g, '-');
    const sessionId = `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      id: sessionId,
      callsign: normalized,
      hasGroqKey: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Session POST error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// ─── PUT: Validate Groq API key (stateless) ───────────────────
// The key itself is stored client-side in Zustand (not sent to our server).
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { groqKey } = body;

    if (!groqKey || typeof groqKey !== 'string' || groqKey.length < 10) {
      return NextResponse.json(
        { error: 'Valid Groq API key required (min 10 chars)' },
        { status: 400 },
      );
    }

    const isValid = await validateGroqApiKey(groqKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Groq API key', valid: false }, { status: 400 });
    }

    return NextResponse.json({ valid: true, message: 'Groq API key validated' });
  } catch (error) {
    console.error('Session PUT error:', error);
    return NextResponse.json({ error: 'Failed to validate API key' }, { status: 500 });
  }
}

// ─── GET: Session heartbeat (stateless) ───────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    return NextResponse.json({ id: sessionId, status: 'active' });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
