'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, Input, Skeleton } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminUsers } from '@/hooks/use-admin';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useAdminUsers({
    page,
    search,
    status: statusFilter,
  });

  return (
    <AdminShell>
      <div className="container max-w-7xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Users</h1>

        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by email, username, or name…"
              className="flex-1 min-w-[220px]"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : !data || data.data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No users match
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Sales</th>
                    <th className="text-left p-3">Joined</th>
                    <th className="text-left p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/20 last:border-b-0">
                      <td className="p-3">
                        <div className="font-medium">{user.username ?? user.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{user.role}</Badge>
                        {user.isSeller && (
                          <Badge variant="secondary" className="ml-1">
                            Seller
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">{user.totalSales ?? 0}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Link href={`/users/${user.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
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
