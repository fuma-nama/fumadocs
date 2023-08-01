import { cn } from '@/utils/cn'
import { getTree } from '@/utils/page-tree'
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

  return (
    <main
      className={cn(
        params.mode === 'ui' && '[--primary:213_94%_68%]',
        params.mode === 'headless' && '[--primary:270_95%_75%]'
      )}
    >
      <DocsLayout tree={tree} nav={false}>
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
