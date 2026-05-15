import { NextRequest, NextResponse } from 'next/server';
import { exportTTPsAsMarkdown, type TTPExport } from '@/lib/mutation-engine';

// ─── GET: Return empty (mutations tracked client-side) ────────
export async function GET() {
  return NextResponse.json({ mutations: [], total: 0 });
}

// ─── POST: Generate markdown from client-supplied mutations ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mutations, format } = body;

    if (format === 'markdown' && Array.isArray(mutations)) {
      const ttps: TTPExport[] = mutations.map(
        (m: Record<string, unknown>) => ({
          id: (m.id as string) || '',
          opCode: (m.opCode as string) || '',
          ttpName: (m.ttpName as string) || '',
          ttpCategory: (m.ttpCategory as string) || '',
          hardeningLevel: (m.hardeningLevel as number) || 1,
          description: (m.description as string) || '',
          mutationApplied: (m.mutationApplied as string) || '',
          date: (m.createdAt as string) || new Date().toISOString(),
          isNew: false,
        }),
      );
      const md = exportTTPsAsMarkdown(ttps);
      return new NextResponse(md, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    return NextResponse.json({ mutations: [], total: 0 });
  } catch (error) {
    console.error('Mutations POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process mutations' },
      { status: 500 },
    );
  }
}
