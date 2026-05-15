import { NextRequest, NextResponse } from 'next/server';
import { isDbAvailable, db } from '@/lib/db';
import { exportTTPsAsMarkdown, type TTPExport } from '@/lib/mutation-engine';
import { memGetMutations } from '@/lib/memory-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const format = searchParams.get('format') || 'json';
    const opCode = searchParams.get('opCode');

    if (isDbAvailable) {
      const where: Record<string, unknown> = {};
      if (sessionId) where.sessionId = sessionId;
      if (opCode) where.opCode = opCode;

      const mutations = await db.mutationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'markdown') {
        const ttps: TTPExport[] = mutations.map(m => ({
          id: m.id, opCode: m.opCode, ttpName: m.ttpName,
          ttpCategory: m.ttpCategory, hardeningLevel: m.hardeningLevel,
          description: m.description, mutationApplied: m.mutationApplied,
          date: m.createdAt.toISOString(), isNew: false,
        }));
        const md = exportTTPsAsMarkdown(ttps);
        return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
      }

      return NextResponse.json({
        mutations: mutations.map(m => ({
          id: m.id, opCode: m.opCode, ttpName: m.ttpName,
          ttpCategory: m.ttpCategory, hardeningLevel: m.hardeningLevel,
          description: m.description, mutationApplied: m.mutationApplied,
          createdAt: m.createdAt,
        })),
        total: mutations.length,
      });
    }

    // In-memory fallback
    const memMutations = memGetMutations({
      sessionId: sessionId || undefined,
      opCode: opCode || undefined,
    });

    if (format === 'markdown') {
      const ttps: TTPExport[] = memMutations.map(m => ({
        id: m.id, opCode: m.opCode, ttpName: m.ttpName,
        ttpCategory: m.ttpCategory, hardeningLevel: m.hardeningLevel,
        description: m.description, mutationApplied: m.mutationApplied,
        date: m.createdAt, isNew: false,
      }));
      const md = exportTTPsAsMarkdown(ttps);
      return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
    }

    return NextResponse.json({
      mutations: memMutations.map(m => ({
        id: m.id, opCode: m.opCode, ttpName: m.ttpName,
        ttpCategory: m.ttpCategory, hardeningLevel: m.hardeningLevel,
        description: m.description, mutationApplied: m.mutationApplied,
        createdAt: m.createdAt,
      })),
      total: memMutations.length,
    });
  } catch (error) {
    console.error('Mutations GET error:', error);
    return NextResponse.json({ error: 'Failed to get mutations' }, { status: 500 });
  }
}
