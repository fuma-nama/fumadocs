import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import Logo from '@/public/logo.png';

export default function HomePage(): React.ReactElement {
  return (
    <>
      <style>
        {`
        :root {
          --background: 240 80% 94%;
          --primary: 230 90% 72%;
        }

        .dark {
          --background: 240 40% 20%;
          --primary: 250 70% 94%;
          --border: 250 70% 30%;
          --secondary: 250 30% 36.3%;
          --accent: 250 20% 38.3%;
          --muted-foreground: 230 80% 84%;
          --card: 230 40% 26.3%;
        }
        `}
      </style>
      <main className="container max-w-[1100px] px-2 py-4 lg:py-16">
        <Hero />
      </main>
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse at top, transparent 60%, hsl(var(--primary) / 0.2))',
            'linear-gradient(to bottom, transparent 30%, hsl(var(--primary) / 0.2))',
            'linear-gradient(to bottom, hsl(var(--background)) 40%, transparent)',
          ].join(', '),
        }}
      />
    </>
  );
}

function Hero(): React.ReactElement {
  return (
    <div className="z-[2] flex flex-col items-center text-center">
      <Image alt="logo" src={Logo} className="mb-4 w-full max-w-[400px] px-4" />

      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">
        The Cute Framework.
      </h1>
      <p className="mb-6 h-fit p-2 text-muted-foreground md:max-w-[80%] md:text-xl">
        Fumadocs is the framework for building documentation with{' '}
        <b className="font-medium text-foreground">anime and fuwa fuwa power</b>
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
          href="https://githubbox.com/fuma-nama/fumadocs-ui-template"
          className={cn(
            buttonVariants({
              size: 'lg',
              variant: 'outline',
              className: 'rounded-full bg-background',
            }),
          )}
        >
          Open Demo
        </a>
      </div>
    </div>
  );
}
