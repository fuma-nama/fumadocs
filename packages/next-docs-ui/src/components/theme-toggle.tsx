import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { I18nContext } from '@/contexts/i18n'
import { cn } from '@/utils/cn'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useContext, type ButtonHTMLAttributes } from 'react'

export function ThemeToggle(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setTheme } = useTheme()
  const {
    light = 'Light',
    dark = 'Dark',
    system = 'System'
  } = useContext(I18nContext)?.text ?? {}

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          {...props}
          className={cn(
            'nd-w-9 nd-h-9 nd-inline-flex nd-justify-center nd-items-center nd-rounded-md hover:nd-bg-accent hover:nd-text-accent-foreground focus-visible:nd-outline-none',
            props.className
          )}
        >
          <SunIcon className="nd-h-5 nd-w-5 nd-rotate-0 nd-scale-100 nd-transition-all dark:-nd-rotate-90 dark:nd-scale-0" />
          <MoonIcon className="nd-absolute nd-h-5 nd-w-5 nd-rotate-90 nd-scale-0 nd-transition-all dark:nd-rotate-0 dark:nd-scale-100" />
          <span className="nd-sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          {light}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          {dark}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          {system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
