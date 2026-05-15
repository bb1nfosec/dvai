import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateGroqApiKey } from '@/lib/groq';

// POST: Create new player session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callsign } = body;

    if (!callsign || typeof callsign !== 'string' || callsign.trim().length < 2) {
      return NextResponse.json({ error: 'Callsign must be at least 2 characters' }, { status: 400 });
    }

    const normalized = callsign.trim().toLowerCase().replace(/\s+/g, '-');

    // Check for existing session with this callsign
    const existing = await db.playerSession.findUnique({ where: { callsign: normalized } });
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        callsign: existing.callsign,
        hasGroqKey: !!existing.groqKey,
        createdAt: existing.createdAt,
      });
    }

    const session = await db.playerSession.create({
      data: { callsign: normalized },
    });

    return NextResponse.json({
      id: session.id,
      callsign: session.callsign,
      hasGroqKey: false,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Session POST error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// PUT: Update API keys
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, groqKey } = body;

    if (!sessionId || !groqKey) {
      return NextResponse.json({ error: 'sessionId and groqKey required' }, { status: 400 });
    }

    // Validate Groq API key
    const isValid = await validateGroqApiKey(groqKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Groq API key', valid: false }, { status: 400 });
    }

    const session = await db.playerSession.update({
      where: { id: sessionId },
      data: { groqKey },
    });

    return NextResponse.json({
      id: session.id,
      callsign: session.callsign,
      hasGroqKey: true,
    });
  } catch (error) {
    console.error('Session PUT error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// GET: Get session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const session = await db.playerSession.findUnique({
      where: { id: sessionId },
      include: {
        operations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      callsign: session.callsign,
      hasGroqKey: !!session.groqKey,
      operations: session.operations.map(op => ({
        id: op.id,
        opCode: op.opCode,
        status: op.status,
        hardeningLevel: op.hardeningLevel,
        apiCallCount: op.apiCallCount,
        apiCallBudget: op.apiCallBudget,
        startedAt: op.startedAt,
        solvedAt: op.solvedAt,
      })),
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
