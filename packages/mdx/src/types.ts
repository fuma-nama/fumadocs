import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'next-docs-zeta/mdx-plugins';
import type { TableOfContents } from 'next-docs-zeta/server';
import type { MetaData, PageData } from 'next-docs-zeta/source';

export type SourceFile<Meta extends MetaData, Fronmatter extends PageData> =
  | {
      type: 'meta';
      path: string;
      data: Meta;
    }
  | {
      type: 'page';
      path: string;
      data: MDXPageData<Fronmatter>;
    };

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
