'use client';
import { useTranslations } from '@fuma-translate/react';
import { ArrowDownIcon } from 'lucide-react';
import { createContext, type ReactNode, use, useLayoutEffect, useRef, useState } from 'react';
import { cn } from './cn';

interface Scroll {
  follow: boolean;
  /** turns mounted after it are newly asked */
  ready: boolean;
  /** where the conversation last scrolled itself, to tell its scrolls from the reader's */
  set?: number;
  lastTop: number;
  frame?: number;
}

const ConversationContext = createContext<{ pin: () => void } | null>(null);

/**
 * Follows the answer until the reader scrolls up, asking again follows the new one.
 */
export function Conversation({ className, children }: { className?: string; children: ReactNode }) {
  const t = useTranslations({ note: 'AI chat' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scroll = useRef<Scroll>({ follow: true, ready: false, lastTop: 0 });
  const [atEnd, setAtEnd] = useState(true);
  const [context] = useState(() => ({
    pin() {
      const scroller = scrollRef.current;
      if (!scroller || !scroll.current.ready) return;
      scroll.current.follow = true;
      glide(scroller, scroll.current);
    },
  }));

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const list = listRef.current;
    if (!scroller || !list) return;
    const state = scroll.current;
    state.ready = true;
    jump(scroller, state, endOf(scroller));

    const observer = new ResizeObserver(() => {
      if (state.follow) glide(scroller, state);
      setAtEnd(isAtEnd(scroller, state));
    });
    observer.observe(list);
    observer.observe(scroller);

    const onScroll = () => {
      const top = scroller.scrollTop;
      if (state.set === undefined || Math.abs(top - state.set) > 1) {
        stop(state);
        if (top < state.lastTop - 1) state.follow = false;
        else if (isAtEnd(scroller, state)) state.follow = true;
      }
      state.lastTop = top;
      setAtEnd(isAtEnd(scroller, state));
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      stop(state);
      scroller.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className={cn('relative min-h-0', className)}>
      <div
        ref={scrollRef}
        className="fd-scroll-container size-full overflow-y-auto overscroll-contain"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent)',
        }}
      >
        <div ref={listRef} role="log" className="flex min-h-full flex-col gap-8 px-3 pt-2 pb-6">
          <ConversationContext value={context}>{children}</ConversationContext>
        </div>
      </div>
      <button
        type="button"
        aria-label={t('Scroll to latest', { note: 'aria-label' })}
        tabIndex={atEnd ? -1 : 0}
        data-hidden={atEnd}
        className="absolute bottom-3 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border bg-fd-popover text-fd-muted-foreground shadow-lg transition-[opacity,translate,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-fd-popover-foreground data-[hidden=true]:pointer-events-none data-[hidden=true]:translate-y-2 data-[hidden=true]:opacity-0 motion-reduce:transition-none"
        onClick={context.pin}
      >
        <ArrowDownIcon className="size-4" />
      </button>
    </div>
  );
}

export function Turn({ children }: { children: ReactNode }) {
  const { pin } = use(ConversationContext)!;
  useLayoutEffect(() => pin(), [pin]);

  return <div className="flex flex-col gap-4">{children}</div>;
}

function endOf(scroller: HTMLElement) {
  return scroller.scrollHeight - scroller.clientHeight;
}

/** gliding counts as being at the end */
function isAtEnd(scroller: HTMLElement, state: Scroll) {
  return state.frame !== undefined || endOf(scroller) - scroller.scrollTop < 8;
}

function jump(scroller: HTMLElement, state: Scroll, top: number) {
  scroller.scrollTop = top;
  state.set = scroller.scrollTop;
}

function stop(state: Scroll) {
  if (state.frame !== undefined) cancelAnimationFrame(state.frame);
  state.frame = undefined;
}

let reducedMotion: MediaQueryList | undefined;

/** eases to the end, which may move while gliding */
function glide(scroller: HTMLElement, state: Scroll) {
  stop(state);
  const from = scroller.scrollTop;
  const distance = Math.abs(endOf(scroller) - from);
  reducedMotion ??= matchMedia('(prefers-reduced-motion: reduce)');
  if (distance < 2 || reducedMotion.matches) {
    jump(scroller, state, endOf(scroller));
    return;
  }

  const duration = Math.min(640, Math.max(320, distance / 2));
  // a frame's timestamp can predate this call, the clock starts on the first frame
  let start: number | undefined;
  const step = (now: number) => {
    start ??= now;
    const progress = Math.min(1, (now - start) / duration);
    jump(scroller, state, from + (endOf(scroller) - from) * (1 - (1 - progress) ** 5));
    state.frame = progress < 1 ? requestAnimationFrame(step) : undefined;
  };
  state.frame = requestAnimationFrame(step);
}
