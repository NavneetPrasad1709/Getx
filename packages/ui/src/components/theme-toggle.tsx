'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

/* ThemeToggle — animated sun/moon switch.
 *
 * Adapted from a styled-components widget to tailwind + a scoped <style>
 * block. We keep the original keyframes (cloud-move, star-twinkle,
 * rotate-center) and the rest of the visual choreography, but convert
 * structural classes to tailwind tokens and wire the checkbox to
 * next-themes so it actually switches GETX between light and dark.
 *
 * Layout: a checkbox-driven pill with the slider thumb (sun in light /
 * moon in dark) translating across, gradient color, animated clouds in
 * light, twinkling stars in dark.
 *
 * Tailwind alone can't express all the `:checked + .slider .child`
 * compound selectors cleanly — those live in the scoped <style>
 * namespace below (`.getx-theme-switch`). Keyframes are also scoped.
 */

const SCOPED_STYLES = `
  .getx-theme-switch .slider {
    background-color: #2196f3;
    transition: 0.4s;
  }
  .getx-theme-switch .sun-moon {
    background-color: yellow;
    transition: 0.4s;
  }
  .getx-theme-switch input:checked + .slider {
    background-color: #0b1220;
  }
  .getx-theme-switch input:focus-visible + .slider {
    box-shadow: 0 0 0 3px hsl(217 91% 60% / 0.35);
  }
  .getx-theme-switch input:checked + .slider .sun-moon {
    transform: translateX(26px);
    background-color: #ffffff;
    animation: getx-rotate-center 0.6s ease-in-out both;
  }
  .getx-theme-switch input:checked + .slider .moon-dot {
    opacity: 1;
  }
  .getx-theme-switch input:checked + .slider .stars {
    transform: translateY(0);
    opacity: 1;
  }
  .getx-theme-switch .moon-dot {
    opacity: 0;
    transition: 0.4s;
    fill: #6b7280;
  }
  .getx-theme-switch .stars {
    transform: translateY(-32px);
    opacity: 0;
    transition: 0.4s;
  }
  .getx-theme-switch .star {
    fill: #ffffff;
    position: absolute;
    transition: 0.4s;
    animation: getx-star-twinkle 2s infinite;
  }
  .getx-theme-switch .cloud-light {
    position: absolute;
    fill: #eeeeee;
    animation: getx-cloud-move 6s infinite;
  }
  .getx-theme-switch .cloud-dark {
    position: absolute;
    fill: #cccccc;
    animation: getx-cloud-move 6s infinite;
    animation-delay: 1s;
  }
  .getx-theme-switch .light-ray {
    position: absolute;
    fill: #ffffff;
    opacity: 0.10;
    z-index: -1;
  }
  @keyframes getx-rotate-center {
    0%   { transform: translateX(26px) rotate(0deg); }
    100% { transform: translateX(26px) rotate(360deg); }
  }
  @keyframes getx-cloud-move {
    0%   { transform: translateX(0px); }
    40%  { transform: translateX(4px); }
    80%  { transform: translateX(-4px); }
    100% { transform: translateX(0px); }
  }
  @keyframes getx-star-twinkle {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.2); }
    80%  { transform: scale(0.8); }
    100% { transform: scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .getx-theme-switch .star,
    .getx-theme-switch .cloud-light,
    .getx-theme-switch .cloud-dark,
    .getx-theme-switch input:checked + .slider .sun-moon {
      animation: none !important;
    }
  }
`;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  /* Render a sized placeholder until mounted to avoid hydration mismatch.
     Matches the scaled toggle footprint (42×24) so no layout shift. */
  if (!mounted) {
    return (
      <span
        aria-hidden
        className="inline-block rounded-full bg-muted/30"
        style={{ width: '42px', height: '24px' }}
      />
    );
  }

  const current = (theme === 'system' ? resolvedTheme : theme) ?? 'light';
  const isDark = current === 'dark';

  /* Visual scale — 0.7 shrinks the whole widget to ~42×24 in layout
     while preserving every internal proportion / animation. */
  const scale = 0.7;
  const baseW = 60;
  const baseH = 34;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SCOPED_STYLES }} />
      <div
        className="inline-block shrink-0"
        style={{ width: `${baseW * scale}px`, height: `${baseH * scale}px` }}
      >
      <label
        className="getx-theme-switch relative inline-block"
        style={{
          width: `${baseW}px`,
          height: `${baseH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <input
          type="checkbox"
          checked={isDark}
          onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
          className="opacity-0 w-0 h-0 absolute"
        />
        <div className="slider absolute inset-0 cursor-pointer rounded-[34px] z-0 overflow-hidden">
          <div
            className="sun-moon absolute rounded-full"
            style={{
              height: '26px',
              width: '26px',
              left: '4px',
              bottom: '4px',
            }}
          >
            {/* Moon craters (visible in dark mode) */}
            <svg
              className="moon-dot absolute"
              style={{ left: '10px', top: '3px', width: '6px', height: '6px', zIndex: 4 }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="moon-dot absolute"
              style={{ left: '2px', top: '10px', width: '10px', height: '10px', zIndex: 4 }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="moon-dot absolute"
              style={{ left: '16px', top: '18px', width: '3px', height: '3px', zIndex: 4 }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>

            {/* Sun light rays (visible in light mode behind the sun) */}
            <svg
              className="light-ray"
              style={{ left: '-8px', top: '-8px', width: '43px', height: '43px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="light-ray"
              style={{ left: '-50%', top: '-50%', width: '55px', height: '55px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="light-ray"
              style={{ left: '-18px', top: '-18px', width: '60px', height: '60px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>

            {/* Clouds — drift in light mode */}
            <svg
              className="cloud-dark"
              style={{ left: '30px', top: '15px', width: '40px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="cloud-dark"
              style={{ left: '44px', top: '10px', width: '20px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="cloud-dark"
              style={{ left: '18px', top: '24px', width: '30px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="cloud-light"
              style={{ left: '36px', top: '18px', width: '40px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="cloud-light"
              style={{ left: '48px', top: '14px', width: '20px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg
              className="cloud-light"
              style={{ left: '22px', top: '26px', width: '30px' }}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle cx={50} cy={50} r={50} />
            </svg>
          </div>

          {/* Stars — twinkle in dark mode */}
          <div className="stars">
            <svg
              className="star"
              style={{ width: '20px', top: '2px', left: '3px', animationDelay: '0.3s' }}
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
            <svg
              className="star"
              style={{ width: '6px', top: '16px', left: '3px' }}
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
            <svg
              className="star"
              style={{ width: '12px', top: '20px', left: '10px', animationDelay: '0.6s' }}
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
            <svg
              className="star"
              style={{ width: '18px', top: '0px', left: '18px', animationDelay: '1.3s' }}
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
          </div>
        </div>
      </label>
      </div>
    </>
  );
}
