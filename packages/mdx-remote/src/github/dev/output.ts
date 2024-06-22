import { type PageTree } from 'fumadocs-core/server';
import { type CompileMDXResult } from '@/serialize';

export interface Page<Frontmatter> {
  /**
   * Virtual path of file
   */
  path: string;
  frontmatter: Frontmatter;

  compile: () => Promise<CompileMDXResult<Frontmatter>>;
}

export interface Loader<Frontmatter> {
  pageTree: PageTree.Root;

  getPage: (path: string) => Page<Frontmatter>;
}
