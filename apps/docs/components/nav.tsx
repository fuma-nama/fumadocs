'use client';

import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/utils/cn';
import { modes } from '@/utils/modes';

const item = cva(
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
  const { mode } = useParams();

  return (
    <div className="rounded-md border bg-secondary/50 p-1 text-sm text-muted-foreground max-sm:absolute max-sm:left-[50%] max-sm:translate-x-[-50%]">
      {modes.map((m) => (
        <Link
          key={m.param}
          href={`/docs/${m.param}`}
          className={cn(item({ active: mode === m.param }))}
        >
          {m.name.slice('Next Docs '.length)}
        </Link>
      ))}
    </div>
  );
}
