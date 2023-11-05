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
          <div className="flex flex-row gap-2 items-center p-2 -mt-2 rounded-lg text-card-foreground transition-colors hover:bg-muted/80">
            <Icon
              className={cn(
                'w-9 h-9 p-1.5 shrink-0 rounded-md text-primary bg-gradient-to-b from-primary/50 border border-primary/50',
                params.mode === 'ui' &&
                  '[--primary:213_98%_48%] dark:[--primary:213_94%_68%]',
                params.mode === 'headless' &&
                  '[--primary:270_95%_60%] dark:[--primary:270_95%_75%]'
              )}
            />
            <div>
              <p className="font-medium">{mode.name}</p>
              <p className="text-xs text-muted-foreground">
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
