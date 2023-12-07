import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, type ButtonHTMLAttributes } from 'react'

const buttonVariants = cva('w-7 h-7 p-1.5 rounded-full text-muted-foreground', {
  variants: {
    dark: {
      true: 'dark:text-accent-foreground dark:bg-accent',
      false:
        'text-accent-foreground bg-accent dark:text-muted-foreground dark:bg-transparent'
    }
  }
})

export function ThemeToggle({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setTheme, resolvedTheme } = useTheme()

  const onToggle = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [setTheme, resolvedTheme])

  return (
    <button
      className={cn(
        'inline-flex items-center border p-0.5 rounded-full',
        className
      )}
      aria-label="Toggle Theme"
      onClick={onToggle}
      {...props}
    >
      <SunIcon className={cn(buttonVariants({ dark: false }))} />
      <MoonIcon className={cn(buttonVariants({ dark: true }))} />
    </button>
  )
}
