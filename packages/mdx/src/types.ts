import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'next-docs-zeta/mdx-plugins';
import type { TableOfContents } from 'next-docs-zeta/server';
import type { z } from 'zod';
import type { PageData } from 'next-docs-zeta/source';
import type * as Default from './validate/schema';

/**
 * Defalt MDX properties
 */
export interface MDXExport<Frontmatter = PageData> {
  default: (props: MDXProps) => JSX.Element;
  frontmatter: Frontmatter;
  toc: TableOfContents;
  structuredData: StructuredData;
}

export type MDXPageData<Frontmatter extends PageData = PageData> = Omit<
  Frontmatter,
  'exports'
> & {
  exports: Omit<MDXExport<Frontmatter>, 'frontmatter'>;
};

export type DefaultFrontmatter = z.infer<typeof Default.frontmatterSchema>;

export type DefaultMetaData = z.infer<typeof Default.metaSchema>;
