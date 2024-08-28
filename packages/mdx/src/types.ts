export interface InternalFrontmatter {
  _mdx?: {
    /**
     * Mirror another MDX file
     */
    mirror?: string;
  };
}

export type { SearchIndex } from './webpack-plugins/search-index-plugin';
