'use client';

import { cva } from 'class-variance-authority';
import { Circle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

const itemVariants = cva(
  'inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground',
  {
    variants: {
      active: {
        true: 'text-secondary-foreground',
      },
    },
  },
);

export function ThemeSwitch(props: {
  children: ReactNode;
  style: string;
}): JSX.Element {
  const [active, setActive] = useState(false);

  return (
    <div className="flex flex-row flex-wrap gap-3">
      <button
        type="button"
        className={cn(itemVariants({ active }))}
        onClick={() => {
          setActive((prev) => !prev);
        }}
      >
        <Circle className={cn('h-4 w-4', active && 'fill-primary')} />
        {props.children}
      </button>
      {active ? <style>{props.style}</style> : null}
    </div>
  );
}
