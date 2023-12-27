'use client';

import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/utils/cn';
import { modes } from '@/utils/modes';

const itemVariants = cva(
  'rounded-md px-2 py-1 transition-colors hover:text-accent-foreground',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
      },
    },
  },
);

export function NavChildren(): JSX.Element {
  const mode = useMode();

  return (
    <div className="rounded-md border bg-secondary/50 p-1 text-sm text-muted-foreground max-md:absolute max-md:left-[50%] max-md:translate-x-[-50%]">
      {modes.map((m) => (
        <Link
          key={m.param}
          href={`/docs/${m.param}`}
          className={cn(itemVariants({ active: mode === m.param }))}
        >
          {m.name.slice('Next Docs '.length)}
        </Link>
      ))}
    </div>
  );
}

function useMode(): string | undefined {
  const { slug } = useParams();
  return Array.isArray(slug) && slug.length > 0 ? slug[0] : undefined;
}

export function SidebarBanner(): JSX.Element {
  const mode = useMode();
  const currentMode = modes.find((item) => item.param === mode) ?? modes[0];
  const Icon = currentMode.icon;

  return (
    <div className="-mt-2 flex flex-row items-center gap-2 rounded-lg p-2 text-card-foreground transition-colors hover:bg-muted/80">
      <Icon className="h-9 w-9 shrink-0 rounded-md border border-primary/50 bg-gradient-to-b from-primary/50 p-1.5 text-primary" />
      <div>
        <p className="font-medium">{currentMode.name}</p>
        <p className="text-xs text-muted-foreground">
          {currentMode.description} - {currentMode.version}
        </p>
      </div>
    </div>
  );
}
