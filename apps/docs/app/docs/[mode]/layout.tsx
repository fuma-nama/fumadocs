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
  const [Icon, title, description, version] =
    params.mode === 'ui'
      ? [LayoutIcon, 'Next Docs UI', 'The framework', packageJsonUI.version]
      : [
          LibraryIcon,
          'Next Docs Zeta',
          'The headless library',
          packageJsonZeta.version
        ]

  return (
    <main
      className={cn(
        params.mode === 'ui' &&
          '[--primary:213_98%_60%] dark:[--primary:213_94%_68%]',
        params.mode === 'headless' &&
          '[--primary:270_95%_60%] dark:[--primary:270_95%_75%]'
      )}
    >
      <DocsLayout
        tree={tree}
        nav={{ enabled: false }}
        sidebar={{
          defaultOpenLevel: 0,
          banner: (
            <div className="relative flex flex-row gap-2 items-center p-2 rounded-lg border text-xs bg-card text-card-foreground transition-colors hover:bg-muted/80">
              <Icon className="w-9 h-9 p-2 shrink-0 rounded-md text-primary bg-primary/10 border" />
              <div>
                <p className="font-medium">
                  {title} {version}
                </p>
                <p className="text-muted-foreground">{description}</p>
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
