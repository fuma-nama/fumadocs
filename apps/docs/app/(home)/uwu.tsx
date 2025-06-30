import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import Logo from '@/public/logo.png';

export function UwuHero() {
  return (
    <div className="z-2 hidden flex-col items-center pb-8 text-center bg-fd-background border-x border-t [.uwu_&]:flex">
      <Image
        alt="logo"
        src={Logo}
        className="mb-6 w-full max-w-[400px] px-4"
        priority
      />

      <p className="mb-6 h-fit p-2 text-lg text-fd-muted-foreground md:max-w-[80%] md:text-xl">
        Fumadocs is the framework for building documentation with{' '}
        <b className="font-medium text-fd-foreground">
          anime and fuwa fuwa power
        </b>
        . Using the power of weebs and waifus.
      </p>
      <div className="inline-flex items-center gap-3">
        <Link
          href="/docs"
          className={cn(
            buttonVariants({ size: 'lg', className: 'rounded-full' }),
          )}
        >
          Getting Started
        </Link>
        <a
          href="https://stackblitz.com/~/github.com/fuma-nama/fumadocs-ui-template"
          className={cn(
            buttonVariants({
              size: 'lg',
              variant: 'outline',
              className: 'rounded-full bg-fd-background',
            }),
          )}
        >
          Open Demo
        </a>
      </div>
    </div>
  );
}
