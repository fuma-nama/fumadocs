import { cn } from '@/utils/cn'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, type ButtonHTMLAttributes } from 'react'
import { itemVariants } from './nav'

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
      className={cn(itemVariants({ className }))}
      aria-label="Toggle Theme"
      onClick={onToggle}
      {...props}
    >
      <SunIcon className="dark:nd-hidden" />
      <MoonIcon className="nd-hidden dark:nd-block" />
    </button>
  )
}
