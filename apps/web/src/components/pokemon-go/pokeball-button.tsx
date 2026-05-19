'use client';

import * as React from 'react';
import Link from 'next/link';

/* PokeballButton — pill CTA with an inset Pokéball icon, modeled after
   30.pokemon.com/night-out's "Get tickets" button. Two visual variants:
   - `orange` (primary, filled)
   - `white` (secondary, outlined)

   The Pokéball is pure CSS: a small circle with red/white halves, a dark
   centre ring, and a white inset button. No image asset needed. */

type Variant = 'orange' | 'white';

interface BaseProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: 'md' | 'lg';
  className?: string;
}

interface AsLink extends BaseProps {
  href: string;
  onClick?: never;
  type?: never;
}

interface AsButton extends BaseProps {
  href?: never;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

export type PokeballButtonProps = AsLink | AsButton;

export function PokeballButton(props: PokeballButtonProps) {
  const { variant = 'orange', size = 'md', children, className } = props;

  const sizeCls =
    size === 'lg'
      ? 'h-14 pl-2 pr-7 text-[16px]'
      : 'h-12 pl-1.5 pr-6 text-[14px]';
  const ballSize = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  const variantCls =
    variant === 'orange'
      ? 'bg-[#F59E2B] text-[#0A0B1E] hover:brightness-110 ring-2 ring-[#0A0B1E]'
      : 'bg-white text-[#0A0B1E] hover:bg-white/95 ring-2 ring-[#0A0B1E]';

  const content = (
    <span
      className={`group/btn inline-flex items-center gap-2 rounded-full font-bold transition-all ${sizeCls} ${variantCls} ${className ?? ''}`}
    >
      <Pokeball className={`${ballSize} shrink-0 transition-transform group-hover/btn:rotate-[15deg]`} />
      <span className="font-display tracking-tight">{children}</span>
    </span>
  );

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className="inline-flex">
        {content}
      </Link>
    );
  }

  const { onClick, type = 'button' } = props as AsButton;
  return (
    <button type={type} onClick={onClick} className="inline-flex">
      {content}
    </button>
  );
}

/* Inline Pokéball SVG — flat, dark-outlined, brand-neutral. Switches red
   to inherit if needed. */
function Pokeball({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {/* Outer body — white */}
      <circle cx="20" cy="20" r="18" fill="#FFFFFF" />
      {/* Top half — red (clipped) */}
      <path
        d="M2 20a18 18 0 0 1 36 0H2z"
        fill="#E11D48"
      />
      {/* Outer ring */}
      <circle cx="20" cy="20" r="18" fill="none" stroke="#0A0B1E" strokeWidth="2.5" />
      {/* Center band */}
      <path d="M2 20h36" stroke="#0A0B1E" strokeWidth="3" strokeLinecap="round" />
      {/* Center button outer */}
      <circle cx="20" cy="20" r="5.5" fill="#FFFFFF" stroke="#0A0B1E" strokeWidth="2.5" />
      {/* Center button inner */}
      <circle cx="20" cy="20" r="2" fill="#0A0B1E" />
    </svg>
  );
}
