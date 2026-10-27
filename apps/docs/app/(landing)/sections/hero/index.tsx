import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { command, copy, frameworks } from '../../content';
import { Command } from '../../ui/command';
import { Figure, Lead } from '../../ui/figure';
import { Glitch } from './glitch';
import { Stage } from './stage';

const invert =
  'transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none';

/** a screen below the menu: the text and the sky over the horizon, the sky beside the text on
 * desktop and under it on phones */
export function Hero() {
  return (
    <Figure
      id="fumadocs"
      aria-label="Fumadocs"
      status="ready"
      className="grid min-h-[calc(100svh-var(--lp-menu-h))] grid-rows-[auto_1fr_auto] gap-x-12 px-(--lp-gutter) pb-(--lp-status-h) @container lg:grid-cols-2 lg:grid-rows-[1fr_auto]"
    >
      <div className="py-8 lg:self-center">
        <h1 className="text-[clamp(3rem,7.2vw,6.5rem)] leading-[0.95] font-medium tracking-[-0.045em]">
          <Lead className="text-[0.6em]">{copy.hero.lead}</Lead> Build <Glitch>better</Glitch>
          <br />
          docs.
        </h1>
        <p className="mt-7 max-w-[46ch] text-lg leading-[1.45] text-pretty text-lp-ink-2 lg:text-xl">
          {copy.hero.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/docs"
            className={`inline-flex h-11 items-center justify-center border border-lp-line-strong bg-lp-yellow px-5 font-medium text-[#121210] max-sm:w-full ${invert}`}
          >
            Get started
          </Link>
          <Command command={command} caret className="max-sm:w-full" />
          <a
            href="https://stackblitz.com/github/fuma-nama/fumadocs/tree/main/examples/stackblitz"
            target="_blank"
            rel="noreferrer noopener"
            className={`-ms-2 inline-flex h-11 items-center gap-1 px-2 font-medium underline decoration-lp-line-strong underline-offset-4 ${invert}`}
          >
            Open in StackBlitz
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </div>
        <p className="mt-5 text-sm text-lp-ink-2">
          Runs on{' '}
          {frameworks.map((framework, i) => (
            <span key={framework.name}>
              {i > 0 && <> ·&nbsp;</>}
              <Link href={framework.href} className={`whitespace-nowrap text-lp-ink ${invert}`}>
                {framework.name}
              </Link>
            </span>
          ))}
        </p>
      </div>
      <Stage />
      {/* the horizon: a hairline ruler, a tick every 24px and a longer one every 240px from the gutter */}
      <div
        aria-hidden
        className="relative col-span-full -mx-(--lp-gutter) h-10 border-t border-lp-line-strong"
      >
        <div className="h-1.5 bg-[repeating-linear-gradient(to_right,var(--lp-line-strong)_0_1px,transparent_1px_24px)] bg-position-[var(--lp-gutter)_0]" />
        <div className="absolute inset-x-0 top-0 h-2.5 bg-[repeating-linear-gradient(to_right,var(--lp-line-strong)_0_1px,transparent_1px_240px)] bg-position-[var(--lp-gutter)_0]" />
      </div>
    </Figure>
  );
}
