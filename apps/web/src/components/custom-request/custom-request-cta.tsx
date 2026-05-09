'use client';

import { useState } from 'react';
import { Button, Card, CardContent } from '@getx/ui';
import { CustomRequestModal } from './custom-request-modal';
import type { RequestTabType } from '@/hooks/use-custom-requests';

interface Props {
  gameSlug: string;
  tabType: RequestTabType;
  variant?: 'card' | 'inline' | 'banner';
}

const TAB_LABELS: Record<RequestTabType, string> = {
  ACCOUNTS: 'account',
  TOP_UPS: 'top-up',
  ITEMS: 'item bundle',
  BOOSTING: 'boosting service',
};

export function CustomRequestCTA({ gameSlug, tabType, variant = 'card' }: Props) {
  const [open, setOpen] = useState(false);
  const label = TAB_LABELS[tabType];

  if (variant === 'inline') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-primary hover:underline"
        >
          + Post custom request instead
        </button>
        <CustomRequestModal
          open={open}
          onClose={() => setOpen(false)}
          gameSlug={gameSlug}
          tabType={tabType}
        />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold mb-0.5">Need something specific?</h3>
            <p className="text-sm text-muted-foreground">
              Post a custom request and get personalized offers.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Post Request</Button>
        </div>
        <CustomRequestModal
          open={open}
          onClose={() => setOpen(false)}
          gameSlug={gameSlug}
          tabType={tabType}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold mb-1">Can&apos;t find the right {label}?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Post a custom request and let sellers compete for your business.
          </p>
          <Button onClick={() => setOpen(true)}>Post Custom Request</Button>
        </CardContent>
      </Card>
      <CustomRequestModal
        open={open}
        onClose={() => setOpen(false)}
        gameSlug={gameSlug}
        tabType={tabType}
      />
    </>
  );
}
