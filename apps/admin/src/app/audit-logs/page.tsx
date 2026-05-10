'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Skeleton } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminAuditLogs } from '@/hooks/use-admin';

interface AuditLogRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  userId: string | null;
  ipAddress: string | null;
  severity: string;
  createdAt: string;
}

const SEVERITIES = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;

const SEVERITY_STYLES: Record<string, string> = {
  DEBUG: 'bg-muted/50 text-muted-foreground',
  INFO: 'bg-info/10 text-info',
  WARNING: 'bg-warning/10 text-warning',
  ERROR: 'bg-error/10 text-error',
  CRITICAL: 'bg-error/20 text-error font-bold',
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const { data, isLoading } = useAdminAuditLogs({
    page,
    action: actionFilter,
    severity: severityFilter,
    userId: userIdFilter,
  });

  return (
    <AdminShell>
      <div className="container max-w-7xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Audit Logs</h1>

        <Card className="mb-6">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Action contains…"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            />
            <Input
              placeholder="User ID"
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setPage(1);
              }}
            />
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : !data || data.data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No audit entries match
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3">When</th>
                    <th className="text-left p-3">Severity</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Entity</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data as AuditLogRow[]).map((log) => (
                    <tr
                      key={log.id}
                      className="border-b hover:bg-muted/20 last:border-b-0 align-top"
                    >
                      <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                            SEVERITY_STYLES[log.severity] ?? SEVERITY_STYLES.DEBUG
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{log.action}</td>
                      <td className="p-3 text-xs">
                        {log.entity}
                        {log.entityId && (
                          <span className="text-muted-foreground"> #{log.entityId.slice(-8)}</span>
                        )}
                      </td>
                      <td className="p-3 text-xs font-mono">
                        {log.userId ? log.userId.slice(-8) : '—'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 items-center">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {data.pagination.totalPages} · {data.pagination.total} total
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
