import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { ExtractedReference } from './remark-postprocess';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Core } from '@/core';
import type { DocCollectionItem } from '@/config/build';
import type { StructuredRecords } from '../../../../shared/structured-data';

export interface BuildMDXOptions {
  /**
   * Specify a file path for source
   */
  filePath: string;
  source: string;
  frontmatter?: Record<string, unknown>;

  environment: 'bundler' | 'runtime';
  isDevelopment: boolean;
  /**
   * Only the imports of the output are read, like in the scan build of Vite RSC.
   */
  importsOnly?: boolean;
  _compiler?: CompilerOptions;
}

export interface CompilerOptions {
  addDependency: (file: string) => void;
}

/** the exports of a compiled page, its content and runtime outputs read the params of a page as props */
export interface CompiledMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: StructuredData | StructuredRecords;
  toc: TOCItemType[] | ((props: Record<string, unknown>) => TOCItemType[]);
  default: FC<MDXProps>;
  extractedReferences?:
    | ExtractedReference[]
    | ((props: Record<string, unknown>) => ExtractedReference[]);

  /**
   * Enable from `postprocess` option.
   *
   * A string, or for runtime output a component, render it with `renderToMarkdown` from `fumadocs-core/server`.
   */
  _markdown?: string | FC<MDXProps>;
  /**
   * Enable from `postprocess` option.
   */
  _mdast?: string;
}

export async function buildMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  options: BuildMDXOptions,
): Promise<{ code: string; map?: unknown }> {
  // files compiled without a collection (e.g. `page.mdx` routes) follow the global compiler
  const compiler = collection ? collection.compiler : core.getConfig().global.compiler;

  if (compiler === 'satteri') {
    const { buildSatteriMDX } = await import('./build-satteri');
    return buildSatteriMDX(core, collection, options);
  }

  const { buildJSMDX } = await import('./build-default');
  return buildJSMDX(core, collection, options);
}
