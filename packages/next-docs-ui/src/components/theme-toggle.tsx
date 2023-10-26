import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, type ButtonHTMLAttributes } from 'react'

const buttonVariants = cva('nd-w-7 nd-h-7 nd-p-1.5 nd-rounded-full', {
  variants: {
    dark: {
      true: 'nd-text-muted-foreground dark:nd-text-accent-foreground dark:nd-bg-accent',
      false:
        'nd-text-accent-foreground nd-bg-accent dark:nd-text-muted-foreground dark:nd-bg-transparent'
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
        'nd-inline-flex nd-items-center nd-border nd-p-0.5 nd-rounded-full',
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
