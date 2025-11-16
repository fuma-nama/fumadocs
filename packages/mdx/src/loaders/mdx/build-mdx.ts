import { createProcessor } from '@mdx-js/mdx';
import { VFile } from 'vfile';
import { remarkInclude } from '@/loaders/mdx/remark-include';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import {
  type ExtractedReference,
  type PostprocessOptions,
  remarkPostprocess,
} from '@/loaders/mdx/remark-postprocess';
import type { Core } from '@/core';
import type { DocCollectionItem } from '@/config/build';

type Processor = ReturnType<typeof createProcessor>;

interface BuildMDXOptions {
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

// TODO: allow plugins to customise the type
export interface CompiledMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: StructuredData;
  toc: TOCItemType[];
  default: FC<MDXProps>;

  /**
   * Added by the `last-modified` plugin.
   */
  lastModified?: Date;
  /**
   * Enable from `postprocess` option.
   */
  extractedReferences?: ExtractedReference[];
  /**
   * Enable from `postprocess` option.
   */
  _markdown?: string;
  /**
   * Enable from `postprocess` option.
   */
  _mdast?: string;
}

export interface FumadocsDataMap {
  /**
   * [Fumadocs MDX] raw frontmatter, you can modify it
   */
  frontmatter?: Record<string, unknown>;

  /**
   * [Fumadocs MDX] additional ESM exports to write
   */
  'mdx-export'?: { name: string; value: unknown }[];

  /**
   * [Fumadocs MDX] The compiler object from loader
   */
  _compiler?: CompilerOptions;

  /**
   * [Fumadocs MDX] get internal processor, do not use this on user land.
   */
  _getProcessor?: (format: 'md' | 'mdx') => Processor;
}

declare module 'vfile' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extend data map
  interface DataMap extends FumadocsDataMap {}
}

export async function buildMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  {
    filePath,
    frontmatter,
    source,
    _compiler,
    environment,
    isDevelopment,
  }: BuildMDXOptions,
): Promise<VFile> {
  const mdxOptions = await core
    .getConfig()
    .getMDXOptions(collection, environment);

  function getProcessor(format: 'md' | 'mdx') {
    const cache = core.cache as Map<string, Processor>;
    const key = `build-mdx:${collection?.name ?? 'global'}:${format}`;
    let processor = cache.get(key);

    if (!processor) {
      const postprocessOptions: PostprocessOptions = {
        _format: format,
        ...collection?.postprocess,
        valueToExport: [
          ...(collection?.postprocess?.valueToExport ?? []),
          'structuredData',
          'frontmatter',
        ],
      };

      processor = createProcessor({
        outputFormat: 'program',
        development: isDevelopment,
        ...mdxOptions,
        remarkPlugins: [
          remarkInclude,
          ...(mdxOptions.remarkPlugins ?? []),
          [remarkPostprocess, postprocessOptions],
        ],
        format,
      });

      cache.set(key, processor);
    }

    return processor;
  }

  let vfile = new VFile({
    value: source,
    path: filePath,
    data: { frontmatter, _compiler, _getProcessor: getProcessor },
  });

  if (collection) {
    vfile = await core.transformVFile({ collection, filePath, source }, vfile);
  }

  return getProcessor(filePath.endsWith('.mdx') ? 'mdx' : 'md').process(vfile);
}
