'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@getx/ui';

/* HowItWorksCinematic — GETX adaptation of the 21st.dev cinematic-hero.
 *
 * Three-act scroll-pinned reveal that walks through GETX's checkout
 * flow: opening tagline → premium dark card with iPhone mockup showing
 * an order in escrow → final CTA. Uses GSAP ScrollTrigger to pin and
 * scrub the timeline so each act lands as the user scrolls.
 *
 * Adaptation notes vs the source component:
 *   - Copy rebranded for GETX (5 min median delivery, escrow narrative).
 *   - cn helper sourced from @getx/ui (the workspace's shared utils).
 *   - Section ID `how-it-works` so the hero CTA still anchors here.
 *   - Phone mockup widgets show "Escrow locked" + "Credentials sent"
 *     so the device demonstrates the marketplace, not a sobriety app.
 */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  /* Hairline grid — barely visible, calms the eye, no film grain. */
  .bg-grid-theme {
      background-size: 80px 80px;
      background-image:
          linear-gradient(to right, hsl(var(--foreground) / 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--foreground) / 0.04) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  /* Outside the card — theme-aware silver, no heavy shadow noise. */
  .text-silver-matte {
      background: linear-gradient(180deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.55) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
  }

  /* Inside the dark card — hardcoded silver because the bg is fixed. */
  .text-card-silver-matte {
      background: linear-gradient(180deg, #FFFFFF 0%, #C8D2E6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
  }

  /* Premium card — built from the brand cobalt token. The deeper
     end uses a near-black ink so the gradient still has depth on
     light backgrounds. */
  .premium-depth-card {
      background:
          linear-gradient(145deg,
              hsl(var(--primary) / 0.92) 0%,
              hsl(222 60% 8%) 70%,
              hsl(222 60% 5%) 100%);
      box-shadow:
          0 40px 100px -28px hsl(222 60% 4% / 0.55),
          0 18px 40px -20px hsl(var(--primary) / 0.32),
          inset 0 1px 2px hsl(0 0% 100% / 0.14),
          inset 0 -2px 4px hsl(222 60% 0% / 0.6);
      border: 1px solid hsl(0 0% 100% / 0.05);
      position: relative;
  }

  .card-sheen {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
      background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 40%);
      mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  .iphone-bezel {
      background-color: #111;
      box-shadow:
          inset 0 0 0 2px #52525B,
          inset 0 0 0 7px #000,
          0 40px 80px -15px rgba(0,0,0,0.9),
          0 15px 25px -5px rgba(0,0,0,0.7);
      transform-style: preserve-3d;
  }

  .hardware-btn {
      background: linear-gradient(90deg, #404040 0%, #171717 100%);
      box-shadow:
          -2px 0 5px rgba(0,0,0,0.8),
          inset -1px 0 1px rgba(255,255,255,0.15),
          inset 1px 0 2px rgba(0,0,0,0.8);
      border-left: 1px solid rgba(255,255,255,0.05);
  }

  .screen-glare {
      background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%);
  }

  .widget-depth {
      background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      box-shadow:
          0 10px 20px rgba(0,0,0,0.3),
          inset 0 1px 1px rgba(255,255,255,0.05),
          inset 0 -1px 1px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.03);
  }

  .floating-ui-badge {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.1),
          0 25px 50px -12px rgba(0, 0, 0, 0.8),
          inset 0 1px 1px rgba(255,255,255,0.2),
          inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  .btn-modern-light, .btn-modern-dark {
      transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .btn-modern-light {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
      color: #0F172A;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-modern-light:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 6px 12px -2px rgba(0,0,0,0.15), 0 20px 32px -6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-modern-light:active {
      transform: translateY(1px);
      background: linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%);
  }
  .btn-modern-dark {
      background: linear-gradient(180deg, #27272A 0%, #18181B 100%);
      color: #FFFFFF;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.6), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-modern-dark:hover {
      transform: translateY(-3px);
      background: linear-gradient(180deg, #3F3F46 0%, #27272A 100%);
  }

  .progress-ring {
      transform: rotate(-90deg);
      transform-origin: center;
      stroke-dasharray: 402;
      stroke-dashoffset: 402;
      stroke-linecap: round;
  }

  /* Live-activity marquee — duplicated track scrolls left forever
     so the card feels like a real running marketplace, not a static
     mockup. Two identical halves loop seamlessly at -50%. */
  .ticker-track {
      animation: getx-ticker 55s linear infinite;
      width: max-content;
      will-change: transform;
  }
  @keyframes getx-ticker {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
  }
  .ticker-track:hover { animation-play-state: paused; }
  @media (prefers-reduced-motion: reduce) {
      .ticker-track { animation: none; }
  }
  .ticker-fade {
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%);
              mask-image: linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%);
  }
`;

/* Each chip shows one verified marketplace event. The mix is
   deliberately half buyer-side (GOT/DELIVERED/UNLOCKED/GRAB) and
   half seller-side (CASHOUT/SOLD/RELEASED) so a first-time visitor
   sees both audiences winning at the same time. */
const ACTIVITY_ITEMS: ReadonlyArray<{
  label: string;
  side: 'buyer' | 'seller';
  text: string;
  amt: string;
}> = [
  { label: 'GOT',       side: 'buyer',  text: '@kira grabbed a Lv50 Mystic acc',     amt: '$149' },
  { label: 'CASHOUT',   side: 'seller', text: '@milos paid out',                     amt: '$487' },
  { label: 'DELIVERED', side: 'buyer',  text: '14,500 PokéCoins · 3 min',            amt: '$97'  },
  { label: 'SOLD',      side: 'seller', text: "@luca's drop cleared in 4 min",       amt: '$228' },
  { label: 'UNLOCKED',  side: 'buyer',  text: '@rio added auto-catcher boost',       amt: '$52'  },
  { label: 'RELEASED',  side: 'seller', text: 'escrow → @sage',                      amt: '$311' },
  { label: 'GRAB',      side: 'buyer',  text: '@noah got an OG 2014 account',        amt: '$389' },
  { label: 'CASHOUT',   side: 'seller', text: '@aria paid out',                      amt: '$162' },
];

export interface HowItWorksCinematicProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  metricValue?: number;
  metricLabel?: string;
  ctaHeading?: string;
  ctaDescription?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
}

export function HowItWorksCinematic({
  brandName = 'GETX',
  tagline1 = 'From cart to cashout.',
  tagline2 = 'In five minutes flat.',
  cardHeading = 'Buyers get the goods. Sellers get paid.',
  cardDescription = (
    <>
      Tap <span className="text-white font-semibold">Get it now</span>. Escrow
      locks the cash. A Sumsub-verified seller delivers — usually before your
      tea cools. Confirm receipt and the seller cashes out instantly. No
      chargebacks. No scams. No Discord-DM roulette.
    </>
  ),
  metricValue = 5,
  metricLabel = 'Min · cart to credentials',
  ctaHeading = 'Pick your side. Start in 10 seconds.',
  ctaDescription = '240+ live drops shipping inside the hour — or list one yourself, get verified today and cash out by tomorrow.',
  primaryCtaHref = '/games/pokemon-go/accounts',
  primaryCtaLabel = 'Browse drops',
  secondaryCtaHref = '/sellers/program',
  secondaryCtaLabel = 'Start selling',
  className,
  ...props
}: HowItWorksCinematicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  /* Mouse-driven sheen + 3D parallax on the iPhone mockup. */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(requestRef.current);

      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current && mockupRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          mainCardRef.current.style.setProperty('--mouse-x', `${mouseX}px`);
          mainCardRef.current.style.setProperty('--mouse-y', `${mouseY}px`);

          const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
          const yVal = (e.clientY / window.innerHeight - 0.5) * 2;

          /* Reduced parallax range from ±12° → ±7°. The smaller
             envelope keeps the mockup feeling grounded and removes
             the jolt that the user reported. */
          gsap.to(mockupRef.current, {
            rotationY: xVal * 7,
            rotationX: -yVal * 7,
            ease: 'power2.out',
            duration: 1.4,
          });
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  /* Scroll-pinned timeline that drives the three-act reveal. */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      /* Smoothness tuning notes:
         - Single ease (power3.inOut/out) drives almost every move so
           the timeline reads as one continuous motion instead of a
           relay of bouncy back/expo curves.
         - Pinned duration trimmed from 7000 → 5200 so each act
           advances on a normal trackpad swipe.
         - Blur exits earlier so the page never sits in a foggy state. */

      gsap.set('.text-track', {
        autoAlpha: 0, y: 40, scale: 0.92, filter: 'blur(12px)',
      });
      gsap.set('.text-days', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
      gsap.set('.main-card', { y: window.innerHeight + 160, autoAlpha: 1 });
      gsap.set(
        ['.card-left-text', '.card-right-text', '.mockup-scroll-wrapper', '.floating-badge', '.phone-widget', '.activity-ticker'],
        { autoAlpha: 0 },
      );
      gsap.set('.cta-wrapper', { autoAlpha: 0, scale: 0.92, filter: 'blur(16px)' });

      const introTl = gsap.timeline({ delay: 0.25 });
      introTl
        .to('.text-track', {
          duration: 1.2, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'power3.out',
        })
        .to(
          '.text-days',
          { duration: 1.0, clipPath: 'inset(0 0% 0 0)', ease: 'power3.inOut' },
          '-=0.7',
        );

      /* Sticky header height — pin starts 72px below the viewport top
         so the dark card never tucks under the navbar on short
         viewports. Matches the TIER-2 sticky bar in header.tsx. */
      const HEADER_OFFSET = 72;

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: `top top+=${HEADER_OFFSET}`,
          end: '+=5200',
          pin: true,
          pinSpacing: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      scrollTl
        .to(
          ['.hero-text-wrapper', '.bg-grid-theme'],
          { scale: 1.08, filter: 'blur(8px)', opacity: 0.2, ease: 'power3.inOut', duration: 2 },
          0,
        )
        .to('.main-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
        .to('.main-card', {
          width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.4,
        })
        .fromTo(
          '.mockup-scroll-wrapper',
          { y: 140, rotationX: 14, autoAlpha: 0, scale: 0.85 },
          { y: 0, rotationX: 0, autoAlpha: 1, scale: 1, ease: 'power3.out', duration: 1.6 },
          '-=0.7',
        )
        .fromTo(
          '.phone-widget',
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.12, ease: 'power3.out', duration: 1.0 },
          '-=1.1',
        )
        .to('.progress-ring', { strokeDashoffset: 60, duration: 1.6, ease: 'power3.inOut' }, '-=0.9')
        .to(
          '.counter-val',
          { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 1.6, ease: 'power3.out' },
          '-=1.6',
        )
        .fromTo(
          '.floating-badge',
          { y: 40, autoAlpha: 0, scale: 0.92 },
          { y: 0, autoAlpha: 1, scale: 1, ease: 'power3.out', duration: 1.0, stagger: 0.15 },
          '-=1.4',
        )
        .fromTo(
          '.card-left-text',
          { x: -24, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, ease: 'power3.out', duration: 1.0 },
          '-=1.1',
        )
        .fromTo(
          '.card-right-text',
          { x: 24, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, ease: 'power3.out', duration: 1.0 },
          '<',
        )
        .fromTo(
          '.activity-ticker',
          { y: 32, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, ease: 'power3.out', duration: 1.0 },
          '-=0.6',
        )
        .to({}, { duration: 2.4 })
        .set('.hero-text-wrapper', { autoAlpha: 0 })
        .set('.cta-wrapper', { autoAlpha: 1 })
        .to({}, { duration: 0.8 })
        .to(
          ['.mockup-scroll-wrapper', '.floating-badge', '.card-left-text', '.card-right-text', '.activity-ticker'],
          { scale: 0.94, y: -24, autoAlpha: 0, ease: 'power3.in', duration: 0.9, stagger: 0.04 },
        )
        .to(
          '.main-card',
          {
            width: isMobile ? '88vw' : '78vw',
            height: isMobile ? '80vh' : '72vh',
            borderRadius: isMobile ? '24px' : '32px',
            ease: 'power3.inOut',
            duration: 1.4,
          },
          'pullback',
        )
        .to(
          '.cta-wrapper',
          { scale: 1, filter: 'blur(0px)', ease: 'power3.inOut', duration: 1.4 },
          'pullback',
        )
        .to('.main-card', { y: -window.innerHeight - 240, ease: 'power3.in', duration: 1.2 });
    }, containerRef);

    return () => ctx.revert();
  }, [metricValue]);

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className={cn(
        'relative w-screen h-screen overflow-hidden flex items-center justify-center bg-background text-foreground font-sans antialiased',
        className,
      )}
      style={{ perspective: '1500px' }}
      aria-label="How GETX works"
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="bg-grid-theme absolute inset-0 z-0 pointer-events-none opacity-60" aria-hidden="true" />

      {/* ACT 1 — opening tagline */}
      <div
        className="hero-text-wrapper absolute z-10 flex flex-col items-center justify-center text-center w-screen px-4 will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <h2 className="text-track gsap-reveal text-3d-matte text-5xl md:text-7xl lg:text-[6rem] font-bold tracking-tight mb-2">
          {tagline1}
        </h2>
        <h2 className="text-days gsap-reveal text-silver-matte text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter">
          {tagline2}
        </h2>
      </div>

      {/* ACT 3 — CTA after the card pulls back */}
      <div className="cta-wrapper absolute z-10 flex flex-col items-center justify-center text-center w-screen px-4 gsap-reveal pointer-events-auto will-change-transform">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-silver-matte">
          {ctaHeading}
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
          {ctaDescription}
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <a
            href={primaryCtaHref}
            className="btn-modern-light flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-[-2px]">
                Get started
              </div>
              <div className="text-xl font-bold leading-none tracking-tight">
                {primaryCtaLabel}
              </div>
            </div>
          </a>
          <a
            href={secondaryCtaHref}
            className="btn-modern-dark flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase mb-[-2px]">
                Learn more
              </div>
              <div className="text-xl font-bold leading-none tracking-tight">
                {secondaryCtaLabel}
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* ACT 2 — premium card with iPhone mockup */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{ perspective: '1500px' }}
      >
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card relative overflow-hidden gsap-reveal flex items-center justify-center pointer-events-auto w-[92vw] md:w-[88vw] lg:w-[85vw] h-[86vh] md:h-[80vh] lg:h-[78vh] max-h-[860px] rounded-[28px] md:rounded-[36px]"
        >
          <div className="card-sheen" aria-hidden="true" />

          <div className="relative w-full h-full max-w-7xl mx-auto px-4 lg:px-10 flex flex-col justify-evenly lg:grid lg:grid-cols-3 items-center lg:gap-6 z-10 pt-4 lg:pt-6 pb-14 lg:pb-16">
            {/* RIGHT (desktop) / TOP (mobile): brand wordmark */}
            <div className="card-right-text gsap-reveal order-1 lg:order-3 flex justify-center lg:justify-end z-20 w-full">
              <h3 className="text-6xl md:text-[6rem] lg:text-[8rem] font-black uppercase tracking-tighter text-card-silver-matte lg:mt-0">
                {brandName}
              </h3>
            </div>

            {/* CENTER: iPhone mockup */}
            <div
              className="mockup-scroll-wrapper order-2 lg:order-2 relative w-full h-[320px] sm:h-[360px] lg:h-[460px] flex items-center justify-center z-10"
              style={{ perspective: '1000px' }}
            >
              {/* Scale chain tuned per-breakpoint so the mockup reads
                  on a 360px phone and a 1920px desktop without
                  bleeding past the card on short laptop viewports. */}
              <div className="relative w-full h-full flex items-center justify-center transform scale-[0.7] sm:scale-[0.8] md:scale-[0.85] lg:scale-[0.92] 2xl:scale-100">
                <div
                  ref={mockupRef}
                  className="relative w-[240px] h-[500px] rounded-[2.6rem] iphone-bezel flex flex-col will-change-transform"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Hardware buttons */}
                  <div className="absolute top-[105px] -left-[3px] w-[3px] h-[22px] hardware-btn rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[140px] -left-[3px] w-[3px] h-[40px] hardware-btn rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[192px] -left-[3px] w-[3px] h-[40px] hardware-btn rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[150px] -right-[3px] w-[3px] h-[60px] hardware-btn rounded-r-md z-0 scale-x-[-1]" aria-hidden="true" />

                  {/* Screen */}
                  <div className="absolute inset-[6px] bg-[#050914] rounded-[2.2rem] overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,1)] text-white z-10">
                    <div className="absolute inset-0 screen-glare z-40 pointer-events-none" aria-hidden="true" />

                    <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[88px] h-[24px] bg-black rounded-full z-50 flex items-center justify-end px-2.5 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                    </div>

                    <div className="relative w-full h-full pt-9 px-4 pb-6 flex flex-col">
                      <div className="phone-widget flex justify-between items-center mb-5">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold mb-0.5">
                            Order
                          </span>
                          <span className="text-base font-bold tracking-tight text-white drop-shadow-md">
                            GTX-2026-08471
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-white/5 text-neutral-200 flex items-center justify-center font-bold text-xs border border-white/10 shadow-lg shadow-black/50">
                          MH
                        </div>
                      </div>

                      <div className="phone-widget relative w-36 h-36 mx-auto flex items-center justify-center mb-5 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 176 176" aria-hidden="true">
                          <circle cx="88" cy="88" r="64" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                          <circle className="progress-ring" cx="88" cy="88" r="64" fill="none" stroke="#3B82F6" strokeWidth="12" />
                        </svg>
                        <div className="text-center z-10 flex flex-col items-center">
                          <span className="counter-val text-3xl font-extrabold tracking-tighter text-white">0</span>
                          <span className="text-[7px] text-blue-200/50 uppercase tracking-[0.1em] font-bold mt-0.5 text-center px-2">
                            {metricLabel}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="phone-widget widget-depth rounded-xl p-2.5 flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center mr-2.5 border border-blue-400/20 shadow-inner">
                            <svg className="w-4 h-4 text-blue-400 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 w-24 bg-neutral-200 rounded-full mb-1.5 shadow-inner" />
                            <div className="h-1.5 w-32 bg-neutral-600 rounded-full shadow-inner" />
                          </div>
                          <div className="ml-2 text-[9px] font-mono uppercase tracking-wider text-blue-300/70">
                            $531
                          </div>
                        </div>
                        <div className="phone-widget widget-depth rounded-xl p-2.5 flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center mr-2.5 border border-emerald-400/20 shadow-inner">
                            <svg className="w-4 h-4 text-emerald-400 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 w-28 bg-neutral-200 rounded-full mb-1.5 shadow-inner" />
                            <div className="h-1.5 w-20 bg-neutral-600 rounded-full shadow-inner" />
                          </div>
                          <div className="ml-2 text-[9px] font-mono uppercase tracking-wider text-emerald-300/70">
                            4m 12s
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-white/20 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>
                </div>

                {/* Floating glass badges — GETX flow */}
                <div className="floating-badge absolute flex top-4 lg:top-8 left-[-10px] lg:left-[-40px] floating-ui-badge rounded-xl lg:rounded-2xl p-2.5 lg:p-3 items-center gap-2.5 lg:gap-3 z-30">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-b from-blue-500/20 to-blue-900/10 flex items-center justify-center border border-blue-400/30 shadow-inner">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-xs lg:text-sm font-bold tracking-tight">Escrow locked</p>
                    <p className="text-blue-200/50 text-[10px] lg:text-xs font-medium">Buyer&apos;s cash held safely</p>
                  </div>
                </div>

                <div className="floating-badge absolute flex bottom-10 lg:bottom-16 right-[-10px] lg:right-[-40px] floating-ui-badge rounded-xl lg:rounded-2xl p-2.5 lg:p-3 items-center gap-2.5 lg:gap-3 z-30">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-900/10 flex items-center justify-center border border-emerald-400/30 shadow-inner">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-xs lg:text-sm font-bold tracking-tight">Seller cashed out</p>
                    <p className="text-blue-200/50 text-[10px] lg:text-xs font-medium">Paid in 4 min · zero chargeback</p>
                  </div>
                </div>
              </div>
            </div>

            {/* LEFT (desktop) / BOTTOM (mobile): card heading + description */}
            <div className="card-left-text gsap-reveal order-3 lg:order-1 flex flex-col justify-center text-center lg:text-left z-20 w-full lg:max-w-none px-4 lg:px-0">
              <h3 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-0 lg:mb-5 tracking-tight">
                {cardHeading}
              </h3>
              <p className="hidden md:block text-blue-100/70 text-sm md:text-base lg:text-lg font-normal leading-relaxed mx-auto lg:mx-0 max-w-sm lg:max-w-none">
                {cardDescription}
              </p>
            </div>
          </div>

          {/* Live-activity ticker — mobile-feel marquee across the card
              floor. Buyer wins and seller payouts interleave so a first-
              time visitor reads the marketplace as two-sided at a glance. */}
          <div
            className="activity-ticker gsap-reveal absolute bottom-0 left-0 right-0 z-30 pt-1.5 pb-2 lg:pt-2 lg:pb-2.5 border-t border-white/5 bg-gradient-to-t from-black/50 to-transparent"
            aria-label="Recent GETX activity"
          >
            <div className="mb-1 px-4 lg:px-6 flex items-center gap-1.5 text-[8px] lg:text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live · last 60 seconds
            </div>
            <div className="ticker-fade overflow-hidden">
              <div className="ticker-track flex gap-2 lg:gap-2.5 px-4 lg:px-6">
                {[...ACTIVITY_ITEMS, ...ACTIVITY_ITEMS].map((item, i) => (
                  <div
                    key={`${item.label}-${i}`}
                    className="flex items-center gap-2 px-2.5 py-1 lg:py-1.5 rounded-full bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] shrink-0"
                  >
                    <span
                      className={cn(
                        'font-bold tracking-[0.15em] text-[8px] lg:text-[9px]',
                        item.side === 'buyer' ? 'text-emerald-300' : 'text-blue-300',
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="text-white/80 text-[10px] lg:text-[11px] font-medium whitespace-nowrap">
                      {item.text}
                    </span>
                    <span className="font-mono text-[9px] lg:text-[10px] text-white/50 whitespace-nowrap">
                      {item.amt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
