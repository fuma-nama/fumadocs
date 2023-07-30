'use client'

import clsx from 'clsx'
import { GithubIcon } from 'lucide-react'
import { Nav as OriginalNav } from 'next-docs-ui/components'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const item =
  'px-2 py-1 rounded-md text-muted-foreground transition-colors hover:text-accent-foreground'

export function Nav() {
  const { mode } = useParams()

  return (
    <OriginalNav
      enableSidebar={mode === 'headless' || mode === 'ui'}
      links={[
        {
          icon: <GithubIcon aria-label="Github" className="h-5 w-5" />,
          href: 'https://github.com/SonMooSans/next-docs',
          external: true
        }
      ]}
    >
      <Link
        href="/"
        className="hover:text-muted-foreground whitespace-nowrap font-semibold"
      >
        Next Docs
      </Link>
      <div className="max-sm:absolute max-sm:left-[50%] max-sm:top-[50%] max-sm:translate-x-[-50%] max-sm:translate-y-[-50%]">
        <div className="border-input bg-background rounded-md border p-1 text-sm">
          <Link
            href="/docs/headless"
            className={clsx(
              item,
              mode === 'headless' && 'bg-accent text-accent-foreground'
            )}
          >
            Zeta
          </Link>
          <Link
            href="/docs/ui"
            className={clsx(
              item,
              mode === 'ui' && 'bg-accent text-accent-foreground'
            )}
          >
            UI
          </Link>
        </div>
      </div>
    </OriginalNav>
  )
}
