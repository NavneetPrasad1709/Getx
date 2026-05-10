'use client';

import Link from 'next/link';
import { Card, CardContent, Skeleton } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useDashboard } from '@/hooks/use-admin';

const SEVERITY_STYLES: Record<string, string> = {
  DEBUG: 'bg-muted/50 text-muted-foreground',
  INFO: 'bg-info/10 text-info',
  WARNING: 'bg-warning/10 text-warning',
  ERROR: 'bg-error/10 text-error',
  CRITICAL: 'bg-error/20 text-error font-bold',
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.DEBUG;
  return <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${cls}`}>{severity}</span>;
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="text-2xl font-display font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <AdminShell>
      <div className="container max-w-7xl py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">Live metrics and recent activity</p>

        {isLoading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Total Users"
                value={data.users.total}
                sub={`+${data.users.newThisWeek} this week`}
              />
              <MetricCard label="Active Sellers" value={data.users.activeSellers} />
              <MetricCard
                label="Active Listings"
                value={data.listings.active}
                sub={`${data.listings.total} total`}
              />
              <MetricCard
                label="Total Orders"
                value={data.orders.total}
                sub={`${data.orders.thisWeek} this week`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="GMV All-Time"
                value={`$${data.gmv.allTime.toFixed(2)}`}
                sub={`$${data.gmv.thisWeek.toFixed(2)} this week`}
              />
              <MetricCard
                label="Revenue (Take)"
                value={`$${data.revenue.allTime.toFixed(2)}`}
                sub={`$${data.revenue.thisWeek.toFixed(2)} this week`}
                accent
              />
              <MetricCard label="Pending Payouts" value={`$${data.pendingPayouts.toFixed(2)}`} />
              <MetricCard label="Total Reviews" value={data.totalReviews} />
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Recent Activity</h2>
                  <Link href="/audit-logs" className="text-sm text-primary hover:underline">
                    View all →
                  </Link>
                </div>

                {data.recentAudits.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No activity yet.</p>
                ) : (
                  <div className="space-y-1">
                    {data.recentAudits.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/40 rounded text-sm gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SeverityBadge severity={log.severity} />
                          <span className="font-mono text-xs truncate">{log.action}</span>
                          {log.entity && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {log.entity}
                              {log.entityId ? `:${log.entityId.slice(-6)}` : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}
