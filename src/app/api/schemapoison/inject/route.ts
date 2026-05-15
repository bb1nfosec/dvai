import { NextRequest, NextResponse } from 'next/server';
import { injectDocument, type SchemaPoisonState } from '@/lib/schemapoison-engine';
import { encrypt, decrypt } from '@/lib/crypto';
import { checkRateLimit, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_schemapoison';
const COOKIE_MAX_AGE = 60 * 60 * 24;

function readCookie(request: NextRequest): SchemaPoisonState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as SchemaPoisonState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: SchemaPoisonState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

// ─── POST: Inject a poisoned document into the KB ───────────
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Document title required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Document content required' }, { status: 400 });
    }

    if (content.length < 20) {
      return NextResponse.json(
        { error: 'Document content too short (minimum 20 characters)' },
        { status: 400 },
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Document content too long (maximum 5000 characters)' },
        { status: 400 },
      );
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation. Initialize first.' }, { status: 400 });
    }

    if (state.phase !== 'inject') {
      return NextResponse.json(
        { error: `Cannot inject in "${state.phase}" phase. Document already injected.` },
        { status: 400 },
      );
    }

    // ANTI-CHEAT: Rate limit injections
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('schemapoison-inject', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many injection attempts. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    const { doc, warning } = injectDocument(state, title.trim(), content.trim());

    const response = NextResponse.json({
      documentId: doc.id,
      title: doc.title,
      topic: doc.topic,
      totalDocuments: state.kbDocuments.length,
      newPhase: state.phase,
      warning,
    });

    setCookie(response, state);
    return response;
  } catch (error) {
    console.error('SchemaPoison inject error:', error);
    return NextResponse.json({ error: 'Failed to inject document' }, { status: 500 });
  }
}
