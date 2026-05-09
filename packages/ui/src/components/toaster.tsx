'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { useTheme } from 'next-themes';

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  const resolvedTheme = (theme === 'system' ? 'system' : theme) as ToasterProps['theme'];

  return (
    <SonnerToaster
      theme={resolvedTheme ?? 'system'}
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-surface text-foreground border-border shadow-lg rounded-lg font-sans',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted/20 text-foreground',
        },
      }}
      {...props}
    />
  );
}
