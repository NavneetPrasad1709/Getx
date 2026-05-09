'use client';

import { useEffect, useState } from 'react';
import { Button } from '@getx/ui';
import { CustomRequestModal } from './custom-request-modal';
import type { RequestTabType } from '@/hooks/use-custom-requests';

interface Props {
  gameSlug: string;
  tabType: RequestTabType;
}

export function FloatingCTA({ gameSlug, tabType }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div
        className={`fixed bottom-4 right-4 z-40 transition-all ${
          scrolled ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        <Button onClick={() => setOpen(true)} size="lg" className="shadow-lg">
          + Post Request
        </Button>
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
