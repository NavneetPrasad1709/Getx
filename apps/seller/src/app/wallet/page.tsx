'use client';

import { Card, CardContent } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useAuth } from '@/hooks/use-auth';

export default function WalletPage() {
  const { user } = useAuth();
  const sellerWallet = user?.sellerWallet ?? 0;
  const pendingEarnings = user?.pendingEarnings ?? 0;

  return (
    <SellerShell>
      <div className="container max-w-3xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Wallet</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Available</div>
              <div className="text-3xl font-display font-bold">${sellerWallet.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Pending</div>
              <div className="text-3xl font-display font-bold">${pendingEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="font-display text-xl font-semibold mb-2">
              Withdrawals coming in Prompt 12
            </h3>
            <p className="text-muted-foreground">
              KYC + bank account + UPI/PayPal/Wise withdrawals.
            </p>
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}
