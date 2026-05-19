import { NextResponse } from 'next/server';
import { prisma } from '@getx/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - started,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
