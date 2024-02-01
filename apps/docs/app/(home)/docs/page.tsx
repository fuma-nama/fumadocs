import { cva } from 'class-variance-authority';
import { LayoutIcon, LibraryIcon } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';

const cardVariants = cva(
  'flex flex-col rounded-xl border border-primary/10 bg-background bg-gradient-to-br from-transparent to-primary/10 p-6 shadow-inner shadow-primary/10 transition-colors hover:bg-muted',
);

const cardIconVariants = cva(
  'mb-2 size-9 rounded-lg border bg-gradient-to-b from-primary/20 p-1 shadow-sm shadow-primary/50',
);

export default function DocsPage(): JSX.Element {
  return (
    <main className="container flex flex-col items-center py-16 text-center">
      <div className="absolute inset-0 z-[-1] overflow-hidden [perspective:2000px]">
        <div
          className="absolute bottom-[20%] left-[50%] h-[1200px] w-[1200px] origin-bottom bg-primary/30 opacity-50 duration-1000 animate-in fade-in"
          style={{
            transform: 'rotateX(75deg) translate(-50%, 400px)',
            backgroundImage:
              'radial-gradient(50% 50% at center,transparent,hsl(var(--background))), repeating-linear-gradient(to right,hsl(var(--primary)),hsl(var(--primary)) 1px,transparent 2px,transparent 100px), repeating-linear-gradient(to bottom,hsl(var(--primary)),hsl(var(--primary)) 2px,transparent 3px,transparent 100px)',
          }}
        />
      </div>
      <h1 className="mb-4 text-4xl font-semibold md:text-5xl">
        Getting Started
      </h1>
      <p className="text-muted-foreground">
        You can start with Fumadocs UI, or just use the core library.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <a
          href="https://github.com/fuma-nama/fumadocs"
          rel="noreferrer noopener"
          className={cn(buttonVariants({ size: 'lg' }))}
        >
          Github
        </a>
        <Link
          href="/showcase"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
        >
          Showcase
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
        <Link
          href="/docs/ui"
          className={cn(
            cardVariants({
              className: 'shadow-xl shadow-primary/20 border-primary/70',
            }),
          )}
        >
          <div className={cn(cardIconVariants())}>
            <LayoutIcon className="h-full w-full" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Fumadocs UI</h2>
          <p className="text-sm text-muted-foreground">
            The full-powered documentation framework with an excellent UI.
          </p>
        </Link>
        <Link href="/docs/headless" className={cn(cardVariants())}>
          <div className={cn(cardIconVariants())}>
            <LibraryIcon className="h-full w-full" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Fumadocs Core</h2>
          <p className="text-sm text-muted-foreground">
            The core library of Fumadocs.
          </p>
        </Link>
      </div>
    </main>
  );
}
