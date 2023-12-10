import { cn } from '@/utils/cn'
import { modes } from '@/utils/modes'
import { getUtils } from '@/utils/source'
import { DocsLayout } from 'next-docs-ui/layout'
import type { ReactNode } from 'react'

export default function Layout({
  params,
  children
}: {
  params: { mode: string }
  children: ReactNode
}) {
  const tree = getUtils(params.mode).tree
  const mode = modes.find(mode => mode.param === params.mode) ?? modes[0]
  const Icon = mode.icon

  return (
    <DocsLayout
      tree={tree}
      nav={{ enabled: false }}
      sidebar={{
        defaultOpenLevel: 0,
        banner: (
          <div className="text-card-foreground hover:bg-muted/80 -mt-2 flex flex-row items-center gap-2 rounded-lg p-2 transition-colors">
            <Icon
              className={cn(
                'text-primary from-primary/50 border-primary/50 h-9 w-9 shrink-0 rounded-md border bg-gradient-to-b p-1.5',
                params.mode === 'ui' &&
                  '[--primary:213_98%_48%] dark:[--primary:213_94%_68%]',
                params.mode === 'headless' &&
                  '[--primary:270_95%_60%] dark:[--primary:270_95%_75%]'
              )}
            />
            <div>
              <p className="font-medium">{mode.name}</p>
              <p className="text-muted-foreground text-xs">
                {mode.description} - {mode.version}
              </p>
            </div>
          </div>
        )
      }}
    >
      {children}
    </DocsLayout>
  )
}

export function generateStaticParams() {
  return modes.map(mode => ({
    mode: mode.param
  }))
}
