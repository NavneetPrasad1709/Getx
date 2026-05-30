import { Injectable, Logger } from '@nestjs/common';
import { AuditSeverity, AuditSource, Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogInput {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  source?: AuditSource;
  severity?: AuditSeverity;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity || 'System',
          entityId: input.entityId,
          changes: (input.changes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          metadata:
            (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          sessionId: input.sessionId,
          source: input.source ?? AuditSource.API,
          severity: input.severity || 'INFO',
        },
      });
    } catch (error) {
      this.logger.error('Audit log failed', error as Error);
      // PAY-MED-032: CRITICAL money-trail audits must not be silently lost —
      // rethrow so the caller's transaction rolls back rather than committing
      // a money movement with no audit record.
      if (input.severity === 'CRITICAL') throw error;
    }
  }
}
