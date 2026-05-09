'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@getx/ui';
import { CustomRequestModal } from './custom-request-modal';
import type { RequestTabType } from '@/hooks/use-custom-requests';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'lg' | 'default';

interface Props {
  gameSlug: string;
  tabType: RequestTabType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
}

export function CustomRequestButton({
  gameSlug,
  tabType,
  variant = 'default',
  size = 'default',
  className,
  children = 'Post Custom Request',
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <CustomRequestModal
        open={open}
        onClose={() => setOpen(false)}
        gameSlug={gameSlug}
        tabType={tabType}
      />
    </>
  );
}
