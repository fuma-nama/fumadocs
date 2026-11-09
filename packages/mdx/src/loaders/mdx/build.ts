import type { StructuredDataNodes } from '../../../../shared/structured-data';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Core } from '@/core';
import type { DocCollectionItem } from '@/config/build';
import type { Params } from 'fumadocs-core/source';

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

/** the exports of a compiled page, its content and outputs read the params of a page as props */
export interface CompiledMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: (props: Params) => StructuredDataNodes;
  toc: (props: Params) => TOCItemType[];
  default: FC<MDXProps>;

  /**
   * Enable from `postprocess` option.
   *
   * A component, render it with `renderToMarkdown` from `fumadocs-core/server`.
   */
  _markdown?: FC<MDXProps>;
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
