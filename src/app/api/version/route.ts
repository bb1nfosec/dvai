import { NextResponse } from 'next/server';

export async function GET() {
  // Expose the groq.ts default model to verify deployment
  const defaultModel = 'llama-3.3-70b-versatile';
  return NextResponse.json({
    version: '3.0-stateless',
    defaultModel,
    hasLogprobsRetry: true,
    timestamp: new Date().toISOString(),
  });
}
