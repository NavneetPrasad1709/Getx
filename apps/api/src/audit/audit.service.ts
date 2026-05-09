import { Injectable, Logger } from '@nestjs/common';
import { AuditSeverity, Prisma } from '@getx/database';
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
  source?: string;
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
          source: input.source || 'api',
          severity: input.severity || 'INFO',
        },
      });
    } catch (error) {
      // Never fail the parent operation when audit write fails.
      this.logger.error('Audit log failed', error as Error);
    }
  }
}
