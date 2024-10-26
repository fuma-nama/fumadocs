import { cva } from 'class-variance-authority';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const buttonVariants = cva('size-6 rounded-full p-1 text-fd-muted-foreground', {
  variants: {
    dark: {
      true: 'dark:bg-fd-accent dark:text-fd-accent-foreground',
      false:
        'bg-fd-accent text-fd-accent-foreground dark:bg-transparent dark:text-fd-muted-foreground',
    },
  },
});

export function ThemeToggle({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement {
  const { setTheme, resolvedTheme } = useTheme();

  const onToggle = (): void => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-full border p-0.5',
        className,
      )}
      data-theme-toggle=""
      aria-label="Toggle Theme"
      onClick={onToggle}
      {...props}
    >
      <Sun className={cn(buttonVariants({ dark: false }))} />
      <Moon className={cn(buttonVariants({ dark: true }))} />
    </button>
  );
}
