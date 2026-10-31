import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Figure, FigureHeader } from '../../ui/figure';
import { Command } from '../../ui/command';
import { Stage } from './stage';
import { Wordmark } from './wordmark';
import { command, copy } from '../../content';

const links = [
  { text: 'Docs', href: '/docs' },
  { text: 'Blog', href: '/blog' },
  { text: 'Showcase', href: '/showcase' },
  { text: 'Changelog', href: '/changelog' },
  { text: 'Sponsors', href: 'https://fuma-nama.dev/sponsors', external: true },
  { text: 'GitHub', href: 'https://github.com/fuma-nama/fumadocs', external: true },
];

const button =
  'inline-flex h-11 items-center justify-center border border-lp-line-strong px-3 text-sm font-medium transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink';

export function Start() {
  return (
    <Figure id="start" aria-label="Start" status="awaiting input">
      <Stage>
        <FigureHeader title={copy.start.title} />
        <Command command={command} className="w-full" />
        {/* a row of equal buttons, the last on a row of its own when they don't fit */}
        <div className="flex flex-wrap gap-2 *:min-w-max *:flex-1">
          <Link href="/docs" className={cn(button, 'bg-lp-yellow text-lp-on-yellow')}>
            Get started
          </Link>
          <Link href="/docs/what-is-fumadocs" className={cn(button, 'bg-lp-paper')}>
            Why Fumadocs
          </Link>
          <a
            href="https://github.com/fuma-nama/fumadocs"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(button, 'bg-lp-paper')}
          >
            Star on GitHub
          </a>
        </div>
      </Stage>
      <footer className="border-t border-lp-line pt-10">
        <Wordmark />
        <div className="flex flex-wrap items-center justify-between gap-3 px-(--lp-gutter) pt-4 pb-8">
          <nav aria-label="Footer" className="-mx-2.5 flex flex-wrap text-sm">
            {links.map((link) => (
              <Link
                key={link.text}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noreferrer noopener' : undefined}
                className="inline-flex h-9 items-center px-2.5 transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
              >
                {link.text}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-lp-ink-2">
            MIT licensed. Built by Fuma Nama and{' '}
            <a
              href="https://github.com/fuma-nama/fumadocs/graphs/contributors"
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-lp-line-strong underline-offset-4 hover:text-lp-ink"
            >
              contributors
            </a>
            .
          </p>
        </div>
      </footer>
    </Figure>
  );
}
