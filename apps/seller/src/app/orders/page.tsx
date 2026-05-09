'use client';

import { Card, CardContent } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';

export default function OrdersPage() {
  return (
    <SellerShell>
      <div className="container max-w-5xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Orders</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="font-display text-xl font-semibold mb-2">Coming in Prompt 12</h3>
            <p className="text-muted-foreground">
              Order management with payment, escrow, and delivery tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}
