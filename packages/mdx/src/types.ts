import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TableOfContents } from 'fumadocs-core/server';
import type { MetaData, PageData } from 'fumadocs-core/source';

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

export interface InternalFrontmatter {
  _mdx?: {
    /**
     * Mirror another MDX file
     */
    mirror?: string;
  };
}

export type { SearchIndex } from './webpack-plugins/search-index-plugin';
