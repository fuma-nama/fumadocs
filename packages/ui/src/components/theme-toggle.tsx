import { cva } from 'class-variance-authority';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const buttonVariants = cva('size-7 rounded-full p-1.5 text-muted-foreground', {
  variants: {
    dark: {
      true: 'dark:bg-secondary dark:text-secondary-foreground',
      false:
        'bg-secondary text-secondary-foreground dark:bg-transparent dark:text-muted-foreground',
    },
  },
});

export function ThemeToggle({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  const { setTheme, resolvedTheme } = useTheme();

  const onToggle = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [setTheme, resolvedTheme]);

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-full border p-0.5',
        className,
      )}
      aria-label="Toggle Theme"
      onClick={onToggle}
      {...props}
    >
      <SunIcon className={cn(buttonVariants({ dark: false }))} />
      <MoonIcon className={cn(buttonVariants({ dark: true }))} />
    </button>
  );
}
