'use client';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { ShowcaseObject } from '@/lib/showcases';
import { BEAT, TICK } from '../lib/motion';
import { setStatus } from '../lib/status';
import { Roller } from '../ui/roller';
import { address } from '../ui/site-tile';
import { Window } from '../ui/window';
import { develop, dither, isDithering } from './develop';

/** windows in the stack */
const DEPTH = 3;
/** a title bar's height: what shows of each window behind the front one */
const BAR = 28;
/** CSS px each window behind is inset on both sides, so the stack recedes */
const INSET = 12;
/** time on each site */
const STEP = BEAT * 6;

const sizes =
  '(min-width: 1400px) 635px, (min-width: 1280px) calc(50vw - 48px), (min-width: 1024px) 45vw, calc(100vw - 32px)';

/** a window's place in the stack, front first; tops line up a title bar apart */
function place(depth: number): CSSProperties {
  return {
    left: depth * INSET,
    right: depth * INSET,
    transform: `translateY(${(DEPTH - 1 - depth) * BAR}px)`,
    zIndex: DEPTH - depth,
  };
}

/**
 * The whole showcase on rotation: a stack of windows, the front one in colour, only the title bars
 * of the ones behind showing. Every few beats the front window collapses like a CRT, the stack
 * steps forward, a new window opens at the back and the new front develops from its 1-bit print.
 * Hover or focus holds it.
 */
export function Cascade({
  sites,
  className,
}: {
  sites: Required<ShowcaseObject>[];
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [front, setFront] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  /** windows that mount from now on open from a line */
  const rotating = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const element = stage.current!;
    let timer = 0;
    let visible = false;
    let held = false;
    let printed = false;

    const schedule = () => {
      clearTimeout(timer);
      if (visible && !held && !document.hidden) timer = window.setTimeout(step, STEP);
    };

    function step() {
      const top = element.querySelector<HTMLElement>('[data-depth="0"]');
      if (!top) return;
      // CRT: the front window collapses to a line, then to nothing, showing the print behind it
      const collapse = top.animate(
        [
          { transform: 'scale(1, 1)' },
          { transform: 'scale(1, 0.004)', offset: 0.6 },
          { transform: 'scale(0, 0.004)' },
        ],
        { duration: TICK * 3, easing: 'steps(6, end)', fill: 'forwards' },
      );
      collapse.onfinish = () => {
        rotating.current = true;
        setFront((current) => (current + 1) % sites.length);
        schedule();
      };
    }

    // the windows behind are printed in 1-bit, ready to show when the front one goes
    const plate = () => {
      if (printed) return;
      printed = true;
      for (const item of element.querySelectorAll<HTMLElement>('[data-depth]')) {
        const canvas = item.querySelector('canvas');
        const image = item.querySelector('img');
        if (item.dataset.depth !== '0' && canvas && image)
          void image.decode().then(
            () => dither(canvas, image, 16, 16),
            () => undefined,
          );
      }
    };

    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) plate();
      schedule();
    });
    const hold = () => {
      held = true;
      schedule();
    };
    const release = () => {
      held = element.matches(':hover') || element.contains(document.activeElement);
      schedule();
    };
    view.observe(element);
    element.addEventListener('pointerenter', hold);
    element.addEventListener('pointerleave', release);
    element.addEventListener('focusin', hold);
    element.addEventListener('focusout', release);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      clearTimeout(timer);
      view.disconnect();
      element.removeEventListener('pointerenter', hold);
      element.removeEventListener('pointerleave', release);
      element.removeEventListener('focusin', hold);
      element.removeEventListener('focusout', release);
      document.removeEventListener('visibilitychange', schedule);
      for (const canvas of element.querySelectorAll('canvas')) develop(canvas);
    };
  }, [reduced, sites.length]);

  // after a step: the new front develops, the window joining the back is printed
  useEffect(() => {
    if (!rotating.current) return;
    const element = stage.current!;
    // the status bar follows the figure across the middle of the screen
    const figure = element.closest('[data-figure]')!.getBoundingClientRect();
    if (figure.top < window.innerHeight / 2 && figure.bottom > window.innerHeight / 2)
      setStatus(`showing ${address(sites[front].url)}`);
    for (const item of element.querySelectorAll<HTMLElement>('[data-depth]')) {
      const canvas = item.querySelector('canvas');
      const image = item.querySelector('img');
      if (!canvas || !image) continue;
      if (item.dataset.depth === '0') {
        if (canvas.style.visibility === 'visible' || isDithering(canvas))
          dither(canvas, image, 16, 0);
      } else if (item.dataset.depth === String(DEPTH - 1)) {
        void image.decode().then(
          () => dither(canvas, image, 16, 16),
          () => undefined,
        );
      }
    }
  }, [front, sites]);

  const windows = [];
  for (let depth = DEPTH - 1; depth >= 0; depth--) {
    const site = sites[(front + depth) % sites.length];
    windows.push(
      <a
        key={site.url}
        ref={(element) => {
          // Open: a window joining the back of the stack grows down from its title bar
          if (!element || !rotating.current || depth !== DEPTH - 1) return;
          const from = `${place(depth).transform} scaleY(0.004)`;
          const animation = element.animate(
            [
              { transform: from, transformOrigin: 'top' },
              { transform: place(depth).transform, transformOrigin: 'top' },
            ],
            { duration: TICK * 2, easing: 'steps(4, end)' },
          );
          return () => animation.cancel();
        }}
        data-depth={depth}
        href={site.url}
        target="_blank"
        rel="noreferrer noopener"
        style={place(depth)}
        className="group absolute top-0 outline-offset-2 outline-lp-ink transition-[left,right,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline"
      >
        <Window
          title={
            <span className="-mx-2 block px-2 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
              {address(site.url)}
            </span>
          }
        >
          <span className="sr-only">{site.name}</span>
          <span className="relative block aspect-[1.91/1] overflow-hidden">
            <Image
              src={site.image}
              alt=""
              fill
              sizes={sizes}
              loading={depth === 0 ? 'eager' : undefined}
              className="object-cover"
            />
            <canvas
              aria-hidden
              className="pointer-events-none invisible absolute top-0 left-0 [image-rendering:pixelated]"
            />
          </span>
        </Window>
      </a>,
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div ref={stage} className="relative">
        {/* holds the stack's size: the front window and the title bars behind it */}
        <div
          aria-hidden
          style={{ marginTop: (DEPTH - 1) * BAR }}
          className="invisible flex flex-col border"
        >
          <span className="h-7 border-b" />
          <span className="aspect-[1.91/1]" />
        </div>
        {windows}
      </div>
      <p className="flex h-12 items-center border border-lp-line-strong bg-lp-ink px-3 font-pixel text-[18px] leading-none text-lp-paper sm:text-2xl dark:bg-lp-paper-2 dark:text-lp-ink">
        <Roller value={sites[front].name} step={TICK / 3} stagger={TICK / 6} />
      </p>
    </div>
  );
}
