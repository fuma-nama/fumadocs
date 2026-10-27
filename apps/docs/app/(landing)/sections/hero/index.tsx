import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { command, copy, frameworks } from '../../content';
import { Command } from '../../ui/command';
import { Figure, Lead } from '../../ui/figure';
import { Glitch } from './glitch';
import { Stage } from './stage';

const invert =
  'transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none';

/**
 * The moon: `--d` diameter, `--cut` its part below the horizon, `--cx` its centre, over `--h`, the
 * horizon's height (the status bar overlays it on md+). The drawing, 1.46 diameters wide, stays in
 * the gutters (`cqw`); on xl it takes the room right of the 607px CTA row.
 */
const geometry =
  '[--h:calc(var(--lp-status-h)+40px)] [--d:min(260px,calc(100cqw/1.46))] sm:[--d:320px] lg:[--d:360px] xl:[--d:min(480px,calc((100cqw-640px)/1.46))] [--cut:calc(var(--d)*0.12)] [--cx:50%] lg:[--cx:calc(100%-var(--d)*0.78)] xl:[--cx:calc(100%-var(--lp-gutter)-var(--d)*0.73)] [--moon-lit:var(--lp-sun)] dark:[--moon-lit:var(--lp-yellow)]';

export function Hero() {
  return (
    <Figure
      id="fumadocs"
      aria-label="Fumadocs"
      status="ready"
      className={`isolate flex min-h-[calc(100svh-var(--lp-menu-h))] flex-col px-(--lp-gutter) pb-(--h) @container ${geometry}`}
    >
      <div className="relative z-10 flex flex-col pt-8 lg:my-auto lg:py-6">
        {/* three lines, sized by width and by the height left for the sky, so the horizon stays on
            screen; a phone's narrow column breaks it where it fits */}
        <h1 className="text-[clamp(3rem,7.2vw,6.5rem)] leading-[0.95] font-medium tracking-[-0.045em] lg:max-xl:text-[clamp(3rem,min(6.4vw,calc((100svh-530px)/2.85)),6.5rem)] xl:text-[clamp(3rem,min(7.2vw,calc((100svh-470px)/2.85)),6.5rem)]">
          <Lead className="text-[0.6em]">{copy.hero.lead}</Lead> Build <Glitch>beautiful</Glitch>
          <br className="max-sm:hidden" /> docs in seconds.
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/docs"
            className={`inline-flex h-11 items-center justify-center border border-lp-line-strong bg-lp-yellow px-5 font-medium text-[#121210] max-sm:w-full ${invert}`}
          >
            Get started
          </Link>
          <Command command={command} caret className="max-sm:w-full" />
          <span aria-hidden className="hidden basis-full lg:max-xl:block" />
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
        <p className="mt-5 font-mono text-xs leading-relaxed text-lp-ink-2">
          Runs on{' '}
          {frameworks.map((framework, i) => (
            <span key={framework.name}>
              {i > 0 && ' · '}
              <Link href={framework.href} className={`text-lp-ink ${invert}`}>
                {framework.name}
              </Link>
            </span>
          ))}
        </p>
      </div>
      <div aria-hidden className="h-[calc(var(--d)-var(--cut)+4.5rem)] lg:hidden" />
      <Stage />
      {/* the horizon: a hairline ruler, a tick every 24px and a longer one every 240px from the gutter */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-(--lp-status-h) z-10 h-10 border-t border-lp-line-strong"
      >
        <div className="h-1.5 bg-[repeating-linear-gradient(to_right,var(--lp-line-strong)_0_1px,transparent_1px_24px)] bg-position-[var(--lp-gutter)_0]" />
        <div className="absolute inset-x-0 top-0 h-2.5 bg-[repeating-linear-gradient(to_right,var(--lp-line-strong)_0_1px,transparent_1px_240px)] bg-position-[var(--lp-gutter)_0]" />
      </div>
    </Figure>
  );
}
