import { cva } from 'class-variance-authority';
import { LayoutIcon, LibraryIcon } from 'lucide-react';
import Link, { type LinkProps } from 'next/link';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import Spot from '@/public/spot.png';

const cardIconVariants = cva(
  'mb-2 size-9 rounded-lg border bg-gradient-to-b from-primary/20 p-1 shadow-sm shadow-primary/50',
);

export default function DocsPage(): React.ReactElement {
  return (
    <main className="container flex flex-col items-center py-16 text-center">
      <div className="absolute inset-0 z-[-1] overflow-hidden duration-1000 animate-in fade-in [perspective:2000px]">
        <div
          className="absolute bottom-[20%] left-1/2 size-[1200px] origin-bottom bg-primary/30 opacity-50"
          style={{
            transform: 'rotateX(75deg) translate(-50%, 400px)',
            backgroundImage:
              'radial-gradient(50% 50% at center,transparent,hsl(var(--background))), repeating-linear-gradient(to right,hsl(var(--primary)),hsl(var(--primary)) 1px,transparent 2px,transparent 100px), repeating-linear-gradient(to bottom,hsl(var(--primary)),hsl(var(--primary)) 2px,transparent 3px,transparent 100px)',
          }}
        />
      </div>
      <div className="absolute inset-0 z-[-1] select-none overflow-hidden opacity-30">
        <Image
          alt="spot"
          src={Spot}
          sizes="100vw"
          className="size-full min-w-[800px] max-w-[1400px]"
          priority
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
        <Item href="/docs/ui">
          <div className={cn(cardIconVariants())}>
            <LayoutIcon className="size-full" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Fumadocs UI</h2>
          <p className="text-sm text-muted-foreground">
            The full-powered documentation framework with an excellent UI.
          </p>
        </Item>
        <Item href="/docs/headless">
          <div className={cn(cardIconVariants())}>
            <LibraryIcon className="size-full" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Fumadocs Core</h2>
          <p className="text-sm text-muted-foreground">
            The core library of Fumadocs.
          </p>
        </Item>
      </div>
    </main>
  );
}

function Item(
  props: LinkProps & { children: React.ReactNode },
): React.ReactElement {
  return (
    <Link
      {...props}
      className="rounded-2xl border border-transparent p-6 shadow-primary/30 transition-all hover:shadow-primary/50"
      style={{
        backgroundImage:
          'linear-gradient(to right bottom, hsl(var(--background)) 40%, hsl(var(--accent)), hsl(var(--background)) 80%),' +
          'linear-gradient(to right bottom, black, rgb(200,200,200), black)',
        backgroundOrigin: 'border-box',
        boxShadow: 'inset 0px 6px 14px 4px var(--tw-shadow-color)',
        backgroundClip: 'padding-box, border-box',
      }}
    >
      {props.children}
    </Link>
  );
}
