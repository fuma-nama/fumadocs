import type { MDXProps } from 'mdx/types';
import type { StructuredData } from '@maximai/fumadocs-core/mdx-plugins';
import type { TableOfContents } from '@maximai/fumadocs-core/server';
import type { MetaData, PageData } from '@maximai/fumadocs-core/source';

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
  default: (props: MDXProps) => React.ReactElement;
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

export type { SearchIndex } from './webpack-plugins/search-index-plugin';
