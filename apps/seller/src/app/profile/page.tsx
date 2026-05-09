'use client';

import { Card, CardContent } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  const { user } = useAuth();
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  return (
    <SellerShell>
      <div className="container max-w-3xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Profile</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Field label="Name" value={user?.name ?? '—'} />
            <Field label="Email" value={user?.email ?? '—'} />
            <Field label="Country" value={user?.country ?? '—'} />
            <Field label="Member since" value={memberSince} />
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
