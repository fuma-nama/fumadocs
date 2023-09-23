'use client'

import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { GithubIcon } from 'lucide-react'
import { Nav as OriginalNav } from 'next-docs-ui/nav'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const item = cva(
  'px-2 py-1 rounded-md transition-colors hover:text-accent-foreground',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground'
      }
    }
  }
)
export function Nav() {
  const { mode } = useParams()
  const [isDown, setDown] = useState(true)

  useEffect(() => {
    const listener = () => {
      setDown(window.document.scrollingElement!.scrollTop < 30)
    }

    listener()
    window.addEventListener('scroll', listener)
    return () => window.removeEventListener('scroll', listener)
  }, [])

  return (
    <OriginalNav
      title="Next Docs"
      enableSidebar={mode === 'headless' || mode === 'ui'}
      links={[
        {
          label: 'Github',
          icon: <GithubIcon />,
          href: 'https://github.com/fuma-nama/next-docs',
          external: true
        }
      ]}
      items={[
        {
          href: '/showcase',
          children: 'Showcase'
        }
      ]}
      transparent={mode == null && isDown}
    >
      <div className="bg-secondary/50 rounded-md border p-1 text-sm text-muted-foreground max-sm:absolute max-sm:left-[50%] max-sm:translate-x-[-50%]">
        <Link
          href="/docs/headless"
          className={cn(item({ active: mode === 'headless' }))}
        >
          Zeta
        </Link>
        <Link href="/docs/ui" className={cn(item({ active: mode === 'ui' }))}>
          UI
        </Link>
      </div>
    </OriginalNav>
  )
}
