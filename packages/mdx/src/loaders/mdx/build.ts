import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
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

/**
 * The exports of a compiled page. The content reads the params of a page as props, so do the outputs of a page with
 * authored expressions or `<show>` branches checked when rendering, they are then functions of the props.
 */
export interface CompiledMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: StructuredData | ((props: Params) => StructuredDataNodes);
  toc: TOCItemType[] | ((props: Params) => TOCItemType[]);
  default: FC<MDXProps>;

  /**
   * Enable from `postprocess` option.
   *
   * A component with `output: 'function'` in `includeProcessedMarkdown`, or for runtime content,
   * render it with `renderToMarkdown` from `fumadocs-core/server`.
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
