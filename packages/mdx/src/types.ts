import type { MDXProps } from 'mdx/types';
import type { StructuredData } from '@fuma-docs/core/mdx-plugins';
import type { TableOfContents } from '@fuma-docs/core/server';
import type { MetaData, PageData } from '@fuma-docs/core/source';

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
  lastModified: number | undefined;
  toc: TableOfContents;
  structuredData: StructuredData;
}

export type MDXPageData<Frontmatter extends PageData = PageData> = Omit<
  Frontmatter,
  'exports'
> & {
  exports: Omit<MDXExport<Frontmatter>, 'frontmatter'>;
};
