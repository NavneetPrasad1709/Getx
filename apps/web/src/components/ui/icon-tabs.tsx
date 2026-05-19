'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@getx/ui';

/* IconTabs — sliding-bubble tab strip with spring-popped icons.
 *
 * Pattern adapted from 21st.dev's Airbnb-style 3d-icon-tabs. We drop
 * the .webm video icons (Airbnb-owned assets) and use Lucide icons
 * with framer-motion spring animations instead — same playful pop,
 * none of the licensing risk. Each tab can carry an href so the
 * strip doubles as navigation.
 *
 * Hover note: hover state is tracked at the wrapper level (button/Link)
 * and propagated down to the icon via an `animate` prop, so hovering
 * the label triggers the icon animation just like hovering the icon
 * itself. Framer's whileHover only fires on the element it's attached
 * to, so we route through React state instead.
 */

export interface IconTab {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  isNew?: boolean;
}

type IconTabsSize = 'sm' | 'md' | 'lg';

interface IconTabsProps {
  tabs: IconTab[];
  activeId?: string;
  defaultActiveId?: string;
  onChange?: (id: string) => void;
  className?: string;
  size?: IconTabsSize;
  renderTab?: (
    tab: IconTab,
    props: {
      onClick: () => void;
      onMouseEnter: () => void;
      onMouseLeave: () => void;
      onFocus: () => void;
      onBlur: () => void;
      className: string;
      'aria-current'?: 'page';
    },
    content: React.ReactNode,
  ) => React.ReactNode;
}

function NewBadge({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      className={cn(
        'bg-primary px-1.5 py-0.5 rounded-t-full rounded-br-full rounded-bl-sm text-[10px] font-bold text-primary-foreground transition-all duration-200 relative overflow-hidden',
        "before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:z-[1]",
        'before:shadow-[inset_0_0_0_1px_rgba(170,202,255,0.2),inset_0_0_10px_0_rgba(170,202,255,0.3),inset_0_3px_7px_0_rgba(170,202,255,0.4),inset_0_-4px_3px_0_rgba(170,202,255,0.4),0_1px_3px_0_rgba(0,0,0,0.50),0_4px_12px_0_rgba(0,0,0,0.65)]',
        'backdrop-blur-md',
        className,
      )}
    >
      <span>NEW</span>
    </motion.div>
  );
}

const SIZE_TOKENS: Record<
  IconTabsSize,
  {
    iconBox: string;
    icon: string;
    label: string;
    layout: string;
    gap: string;
    badgeOffset: string;
    bubble: string;
  }
> = {
  sm: {
    iconBox: 'h-6 w-6',
    icon: 'h-[15px] w-[15px]',
    label: 'text-[12px]',
    layout: 'flex-row gap-0',
    gap: 'gap-x-0.5 sm:gap-x-1',
    badgeOffset: '-top-1 -right-1.5',
    bubble: '-bottom-1 left-1.5 right-1.5 mx-0 w-auto translate-x-0',
  },
  md: {
    iconBox: 'h-14 w-14 md:h-16 md:w-16',
    icon: 'h-7 w-7 md:h-8 md:w-8',
    label: 'text-xs md:text-sm',
    layout: 'flex-col gap-2',
    gap: 'gap-x-6 gap-y-4 md:gap-x-10',
    badgeOffset: '-top-1 -right-3',
    bubble: '-bottom-1.5 left-1/2 -translate-x-1/2 w-10',
  },
  lg: {
    iconBox: 'h-20 w-20',
    icon: 'h-10 w-10',
    label: 'text-sm md:text-base',
    layout: 'flex-col gap-3',
    gap: 'gap-x-8 gap-y-6 md:gap-x-12',
    badgeOffset: '-top-2 -right-4',
    bubble: '-bottom-2 left-1/2 -translate-x-1/2 w-12',
  },
};

export function IconTabs({
  tabs,
  activeId: controlledActiveId,
  defaultActiveId,
  onChange,
  className,
  renderTab,
  size = 'md',
}: IconTabsProps) {
  const [internalActiveId, setInternalActiveId] = React.useState<string>(
    defaultActiveId ?? tabs[0]?.id ?? '',
  );
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const activeId = controlledActiveId ?? internalActiveId;
  const tokens = SIZE_TOKENS[size];

  const handleSelect = (id: string) => {
    if (controlledActiveId == null) setInternalActiveId(id);
    onChange?.(id);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center',
        tokens.gap,
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = activeId === tab.id;
        const isHovered = hoveredId === tab.id;
        const Icon = tab.icon;

        /* Animation target — driven by hover/active state. Hover state
           comes from the wrapper (button/Link), so hovering the label
           or icon-box both trigger the same animation. */
        const iconAnimate: Record<string, number | number[]> = isHovered
          ? {
              scale: 1.15,
              rotate: isActive ? [0, -3, 3, -2, 0] : [0, -8, 8, -4, 0],
            }
          : isActive
            ? { scale: 1, y: [0, -2, 0], rotate: 0 }
            : { scale: 1, y: 0, rotate: 0 };

        const content = (
          <>
            {isActive && (
              <motion.span
                layoutId="getx-icon-tab-bubble"
                className={cn(
                  'absolute h-1 z-10 bg-primary rounded-full',
                  'shadow-[0_0_12px_hsl(var(--primary)/0.6)]',
                  tokens.bubble,
                )}
                transition={{ type: 'spring', bounce: 0.19, duration: 0.4 }}
              />
            )}

            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{
                scale: typeof iconAnimate.scale === 'number' ? iconAnimate.scale : 1,
                rotate: iconAnimate.rotate as number | number[],
                y: (iconAnimate.y as number | number[] | undefined) ?? 0,
              }}
              transition={
                isHovered
                  ? { duration: 0.6, ease: 'easeInOut' }
                  : isActive
                    ? { y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.3 } }
                    : {
                        type: 'spring',
                        bounce: 0.35,
                        damping: 9,
                        duration: 0.55,
                        delay: index * 0.06,
                      }
              }
              whileTap={{
                scale: 0.85,
                rotate: -8,
                transition: { type: 'spring', bounce: 0.4 },
              }}
              className="relative"
            >
              {tab.isNew ? (
                <NewBadge className={cn('absolute z-30', tokens.badgeOffset)} />
              ) : null}

              <motion.div
                animate={{
                  boxShadow: isActive
                    ? '0 0 24px -8px hsl(var(--primary) / 0.55), inset 0 0 0 1px hsl(var(--primary) / 0.25)'
                    : isHovered
                      ? '0 8px 20px -10px hsl(var(--primary) / 0.35), inset 0 0 0 1px hsl(var(--border))'
                      : '0 0 0 0 transparent, inset 0 0 0 0 transparent',
                }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'flex items-center justify-center rounded-lg transition-colors',
                  tokens.iconBox,
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : isHovered
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-transparent text-foreground/90',
                )}
              >
                <Icon className={tokens.icon} strokeWidth={2} />
              </motion.div>
            </motion.div>

            <motion.span
              animate={{
                x: isHovered && !isActive ? 2 : 0,
                color: isActive
                  ? 'hsl(var(--foreground))'
                  : isHovered
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--foreground) / 0.85)',
              }}
              transition={{ duration: 0.2 }}
              className={cn(
                'whitespace-nowrap',
                tokens.label,
                isActive ? 'font-semibold' : 'font-medium',
              )}
            >
              {tab.label}
            </motion.span>
          </>
        );

        const wrapperProps = {
          onClick: () => handleSelect(tab.id),
          onMouseEnter: () => setHoveredId(tab.id),
          onMouseLeave: () =>
            setHoveredId((prev) => (prev === tab.id ? null : prev)),
          onFocus: () => setHoveredId(tab.id),
          onBlur: () =>
            setHoveredId((prev) => (prev === tab.id ? null : prev)),
          className: cn(
            'group relative flex items-center cursor-pointer px-1.5 py-1.5',
            tokens.layout,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md',
          ),
          'aria-current': isActive ? ('page' as const) : undefined,
        };

        if (renderTab) {
          return (
            <React.Fragment key={tab.id}>
              {renderTab(tab, wrapperProps, content)}
            </React.Fragment>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            {...wrapperProps}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
