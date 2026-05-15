import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queryGroq, type GroqMessage } from '@/lib/groq';
import { buildOracleSystemPrompt } from '@/lib/oracle-engine';

// POST: Send a query to the oracle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, message } = body;

    if (!operationId || !message) {
      return NextResponse.json({ error: 'operationId and message required' }, { status: 400 });
    }

    // Fetch operation with session
    const operation = await db.operation.findUnique({
      where: { id: operationId },
      include: { session: true },
    });

    if (!operation || operation.status !== 'active') {
      return NextResponse.json({ error: 'Operation not found or not active' }, { status: 404 });
    }

    if (!operation.session.groqKey) {
      return NextResponse.json({ error: 'No Groq API key configured' }, { status: 400 });
    }

    // Check budget
    if (operation.apiCallCount >= operation.apiCallBudget) {
      return NextResponse.json({
        error: 'API call budget exceeded',
        apiCallCount: operation.apiCallCount,
        apiCallBudget: operation.apiCallBudget,
      }, { status: 429 });
    }

    // Build messages with oracle system prompt
    const systemPrompt = buildOracleSystemPrompt(operation.currentSecret!, operation.hardeningLevel);
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    // Query Groq with logprobs
    const response = await queryGroq(operation.session.groqKey, messages, {
      logprobs: true,
      topLogprobs: 10,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Increment API call counter
    await db.operation.update({
      where: { id: operationId },
      data: { apiCallCount: { increment: 1 } },
    });

    const newCallCount = operation.apiCallCount + 1;
    const choice = response.choices[0];
    const logprobs = choice?.logprobs?.content || null;

    return NextResponse.json({
      id: response.id,
      content: choice?.message?.content || '',
      logprobs,
      model: response.model,
      usage: response.usage,
      apiCallCount: newCallCount,
      apiCallBudget: operation.apiCallBudget,
      remainingBudget: operation.apiCallBudget - newCallCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query oracle';
    console.error('Oracle query error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
