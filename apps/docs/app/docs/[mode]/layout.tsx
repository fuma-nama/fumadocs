import { cn } from '@/utils/cn'
import { getTree } from '@/utils/source'
import { LayoutIcon, LibraryIcon } from 'lucide-react'
import { DocsLayout } from 'next-docs-ui/layout'
import Image from 'next/image'
import type { ReactNode } from 'react'

export default function Layout({
  params,
  children
}: {
  params: { mode: string }
  children: ReactNode
}) {
  const tree = getTree(params.mode)

  const [Icon, title, description] =
    params.mode === 'ui'
      ? [LayoutIcon, 'Next Docs UI', 'The framework']
      : [LibraryIcon, 'Next Docs Zeta', 'The headless library']

  return (
    <main
      className={cn(
        params.mode === 'ui' && '[--primary:213_94%_68%]',
        params.mode === 'headless' && '[--primary:270_95%_75%]'
      )}
    >
      <div
        id="docs-gradient"
        className="absolute right-0 top-0 overflow-hidden z-[-1] sm:right-[20vw]"
      >
        <Image
          alt=""
          src="/gradient.png"
          loading="eager"
          width={800}
          height={800}
          className="min-w-[800px] -mt-44 dark:mt-0"
          aria-hidden
        />
      </div>
      <DocsLayout
        tree={tree}
        nav={{ enabled: false }}
        sidebar={{
          banner: (
            <div className="flex flex-row gap-2 items-center p-2 rounded-lg border bg-card text-card-foreground transition-colors hover:bg-muted">
              <Icon className="w-9 h-9 p-1 shrink-0 border rounded-md text-primary bg-background" />
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
            </div>
          )
        }}
      >
        {children}
      </DocsLayout>
    </main>
  )
}

export function generateStaticParams() {
  return [
    {
      mode: 'ui'
    },
    {
      mode: 'headless'
    }
  ]
}
