import { cn } from '@/utils/cn'
import { getTree } from '@/utils/source'
import { LayoutIcon, LibraryIcon } from 'lucide-react'
import { DocsLayout } from 'next-docs-ui/layout'
import type { ReactNode } from 'react'
import packageJsonUI from '../../../../../packages/next-docs-ui/package.json'
import packageJsonZeta from '../../../../../packages/next-docs/package.json'

export default function Layout({
  params,
  children
}: {
  params: { mode: string }
  children: ReactNode
}) {
  const tree = getTree(params.mode)
  const [Icon, title, version] =
    params.mode === 'ui'
      ? [LayoutIcon, 'Next Docs UI', packageJsonUI.version]
      : [LibraryIcon, 'Next Docs Zeta', packageJsonZeta.version]

  return (
    <main
      className={cn(
        params.mode === 'ui' && '[--primary:213_94%_68%]',
        params.mode === 'headless' && '[--primary:270_95%_75%]'
      )}
    >
      <DocsLayout
        tree={tree}
        nav={{ enabled: false }}
        sidebar={{
          banner: (
            <div className="relative flex flex-row gap-2 items-center p-2 rounded-lg border bg-card text-card-foreground transition-colors hover:bg-muted/80">
              <Icon className="w-9 h-9 p-1 shrink-0 border rounded-md text-primary bg-background" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">v{version}</p>
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
