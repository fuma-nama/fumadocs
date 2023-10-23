import type * as Original from 'next-docs-mdx/types'

declare module 'next-docs-mdx/types' {
  interface Frontmatter extends Original.Frontmatter {
    preview?: string
    index?: boolean
  }

  interface MDXExport extends Original.MDXExport {
    frontmatter: Frontmatter
  }

  interface Page extends Original.Page {
    data: MDXExport
    matter: Frontmatter
  }
}
