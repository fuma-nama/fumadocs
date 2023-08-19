import { cn } from '@/utils/cn'
import { getTree } from '@/utils/source'
import { LayoutIcon, LibraryIcon } from 'lucide-react'
import { DocsLayout } from 'next-docs-ui/layout'
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
        className="absolute inset-x-0 top-0 overflow-hidden z-[-1]"
      >
        <div className="bg-gradient-radial-top mx-auto h-[700px] w-[1500px] from-primary/20 to-80%" />
      </div>
      <DocsLayout
        tree={tree}
        nav={false}
        sidebarBanner={
          <div className="flex flex-row gap-2 items-center p-2 rounded-lg border bg-secondary/70 text-secondary-foreground transition-colors shadow-lg shadow-background hover:bg-accent">
            <Icon className="w-9 h-9 p-1 shrink-0 border rounded-md text-primary bg-background" />
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-muted-foreground text-xs">{description}</p>
            </div>
          </div>
        }
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
