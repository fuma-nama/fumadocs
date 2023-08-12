import { DocsLayout } from 'next-docs-ui/layout'
import type { ReactNode } from 'react'
import { tree } from '../tree'

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={tree} navTitle="My App">
      {children}
    </DocsLayout>
  )
}
