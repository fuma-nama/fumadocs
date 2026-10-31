import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { copy, type Quote, quotes } from '../../content';
import { PORT } from '../../lib/cable';
import { Figure, FigureHeader } from '../../ui/figure';
import { Shadow, Window } from '../../ui/window';
import { Desk } from './stage';

/**
 * The quotes by handle in the order they come, each with its place: from 1024px a grid of two
 * loose columns, shadcn's wide at the left with Aiden's out of its corner, David's and Anthony's at
 * the right, Aiden's and Anthony's both hung off shadcn's foot; on phones a column, each inset
 * unevenly. A grid item's margins are shares of its column. `from` is the window in Projects its
 * cable comes down from, its creator's project.
 */
const VOICES = [
  { handle: 'shadcn', from: 'shadcn-ui', place: 'w-[92%] lg:mt-[9.09%] lg:w-full' },
  {
    handle: 'ssalbdivad',
    from: 'arktype',
    place: 'ms-[8%] mt-6 w-[92%] lg:ms-0 lg:mt-[5%] lg:w-[70%]',
  },
  {
    handle: 'aidenybai',
    place:
      'ms-[2%] mt-3 w-[92%] lg:col-start-1 lg:row-start-2 lg:-mt-10 lg:ms-[59.09%] lg:w-[68.18%]',
  },
  {
    handle: 'anthonyshew',
    from: 'vercel',
    place: 'ms-[6%] mt-8 w-[92%] lg:col-start-2 lg:row-start-2 lg:ms-[5%] lg:mt-2 lg:w-[95%]',
  },
];

/** a quote as a window titled with who said it: its words, the speaker at its foot; with its port,
 * where its project's cable plugs in, from 1024px */
function Voice({ quote, port, className }: { quote: Quote; port: boolean; className: string }) {
  return (
    <div data-window={quote.handle} className={cn('relative isolate', className)}>
      <Shadow />
      <Window title={`@${quote.handle}`}>
        <figure className="flex flex-1 flex-col">
          <blockquote className="relative flex-1 px-6 pt-6 pb-8 text-lg/6.5 font-light text-pretty md:text-xl/7">
            <span aria-hidden className="absolute -translate-x-full text-lp-orange">
              “
            </span>
            {quote.message}
            <span aria-hidden className="text-lp-orange">
              ”
            </span>
          </blockquote>
          <figcaption className="flex items-center gap-3 border-t border-lp-line px-6 py-4">
            <Image
              src={`${quote.avatar}?s=96`}
              alt=""
              width={44}
              height={44}
              unoptimized
              className="size-11 shrink-0 border border-lp-line-strong grayscale"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm/5 font-medium">{quote.name}</span>
              <span className="truncate text-sm/5 text-lp-ink-2">{quote.role}</span>
            </span>
          </figcaption>
        </figure>
      </Window>
      {port && <span data-port aria-hidden className={cn(PORT, 'max-lg:hidden')} />}
    </div>
  );
}

export function Feedback() {
  const voices: ReactNode[] = [];
  for (const voice of VOICES) {
    const quote = quotes.find((item) => item.handle === voice.handle);
    if (quote)
      voices.push(
        <Voice key={voice.handle} quote={quote} port={!!voice.from} className={voice.place} />,
      );
  }

  return (
    <Figure
      id="feedback"
      aria-label="Feedback"
      status={`${voices.length} messages received`}
      className="flex flex-col px-(--lp-gutter) py-(--lp-section)"
    >
      <FigureHeader title={copy.feedback.title} />
      <Desk>{voices}</Desk>
    </Figure>
  );
}

/**
 * Projects and Feedback in one box, and under both the cables down from each creator's project to
 * their quote, from 1024px: a box of their own, so a cable is laid out from both sections' windows.
 * Each cable is its own svg round it, so its draw-on repaints no more than its cable.
 */
export function Wires({ children }: { children: ReactNode }) {
  const wires: ReactNode[] = [];
  for (const voice of VOICES) {
    if (!voice.from) continue;
    wires.push(
      <span
        key={voice.handle}
        data-wire={voice.handle}
        data-from={voice.from}
        className="invisible absolute"
      />,
    );
  }

  return (
    <div data-showcase className="relative">
      {children}
      <div
        aria-hidden
        data-layer
        className="pointer-events-none absolute inset-0 z-0 max-lg:hidden"
      >
        {wires}
      </div>
    </div>
  );
}
