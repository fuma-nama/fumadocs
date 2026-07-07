import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Core } from '@/core';
import type { DocCollectionItem } from '@/config/build';

export interface BuildMDXOptions {
  /**
   * Specify a file path for source
   */
  filePath: string;
  source: string;
  frontmatter?: Record<string, unknown>;

  environment: 'bundler' | 'runtime';
  isDevelopment: boolean;
  _compiler?: CompilerOptions;
}

export interface CompilerOptions {
  addDependency: (file: string) => void;
}

export interface CompiledMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: StructuredData;
  toc: TOCItemType[];
  default: FC<MDXProps>;

  /**
   * Enable from `postprocess` option.
   */
  _markdown?: string;
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
