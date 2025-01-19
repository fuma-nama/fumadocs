'use client';
import { cva } from 'class-variance-authority';
import { Moon, Sun, Airplay } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type HTMLAttributes, useLayoutEffect, useState } from 'react';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'size-7 rounded-full p-1.5 text-fd-muted-foreground',
  {
    variants: {
      active: {
        true: 'bg-fd-accent text-fd-accent-foreground',
        false: 'text-fd-muted-foreground',
      },
    },
  },
);

export function ThemeToggle({
  className,
  mode = 'light-dark',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  mode?: 'light-dark' | 'light-dark-system';
}) {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  let value = mode === 'light-dark' ? resolvedTheme : theme;
  if (!mounted) value = undefined;

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border p-[3px]',
        className,
      )}
      data-theme-toggle=""
      {...props}
    >
      <button
        className={cn(buttonVariants({ active: value === 'light' }))}
        onClick={() => setTheme('light')}
        aria-label="Light Theme"
      >
        <Sun className="size-full" />
      </button>
      <button
        className={cn(buttonVariants({ active: value === 'dark' }))}
        onClick={() => setTheme('dark')}
        aria-label="Dark Theme"
      >
        <Moon className="size-full" />
      </button>
      {mode === 'light-dark-system' ? (
        <button
          className={cn(buttonVariants({ active: value === 'system' }))}
          onClick={() => setTheme('system')}
          aria-label="System Theme"
        >
          <Airplay className="size-full" />
        </button>
      ) : null}
    </div>
  );
}
