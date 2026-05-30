import { Controller, ForbiddenException, Get, Headers } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface DeepCheckEntry {
  status: 'ok' | 'warning' | 'error';
  [key: string]: unknown;
}

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Public()
  @Get()
  async check() {
    // Fast DB ping so Railway's healthcheck doubles as a Neon warm-up.
    // We swallow errors and emit `ok: false` rather than throwing — a
    // transient DB hiccup should NOT cause Railway to recycle the pod
    // (the pod restart wouldn't fix the DB anyway). Uptime monitors
    // looking for `"ok": true` will still spot the degraded state.
    let dbOk = false;
    let dbLatencyMs: number | null = null;
    const t0 = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
      dbLatencyMs = Date.now() - t0;
    } catch {
      dbLatencyMs = Date.now() - t0;
    }

    return {
      ok: dbOk,
      status: dbOk ? ('ok' as const) : ('degraded' as const),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      service: 'getx-api',
      db: { ok: dbOk, latencyMs: dbLatencyMs },
    };
  }

  // RES-MED-040: gate deep health behind a token — exposes process memory/uptime
  @Public()
  @Get('deep')
  async deepCheck(@Headers('x-health-token') token: string | undefined) {
    const expected = this.config.get<string>('HEALTH_TOKEN');
    if (expected && token !== expected) {
      throw new ForbiddenException();
    }
    const checks: Record<string, DeepCheckEntry> = {};

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks.database = {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const mem = process.memoryUsage();
    const heapPct = (mem.heapUsed / mem.heapTotal) * 100;
    checks.memory = {
      status: heapPct < 85 ? 'ok' : 'warning',
      heapPercent: Math.round(heapPct),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    };

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allOk ? ('ok' as const) : ('degraded' as const),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    };
  }
}
