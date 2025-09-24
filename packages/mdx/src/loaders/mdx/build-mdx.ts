import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import type { VFile } from 'vfile';
import { remarkInclude } from '@/loaders/mdx/remark-include';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TableOfContents } from 'fumadocs-core/server';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import {
  type ExtractedReference,
  type PostprocessOptions,
  remarkPostprocess,
} from '@/loaders/mdx/remark-postprocess';

type Processor = ReturnType<typeof createProcessor>;

const cache = new Map<string, Processor>();

interface BuildMDXOptions extends ProcessorOptions {
  /**
   * Specify a file path for source
   */
  filePath: string;

  frontmatter?: Record<string, unknown>;

  /**
   * Custom Vfile data
   */
  data?: Record<string, unknown>;

  _compiler?: CompilerOptions;
  postprocess?: PostprocessOptions;
}

export interface CompilerOptions {
  addDependency: (file: string) => void;
}

export interface CompiledMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: StructuredData;
  toc: TableOfContents;
  default: FC<MDXProps>;

  /**
   * Only available when `lastModifiedTime` is enabled on MDX loader
   */
  lastModified?: Date;
  extractedReferences?: ExtractedReference[];
  _markdown?: string;
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

  extractedReferences: ExtractedReference[];

  /**
   * [Fumadocs MDX] The compiler object from loader
   */
  _compiler?: CompilerOptions;

  _getProcessor?: (format: 'md' | 'mdx') => Processor;

  /**
   * [Fumadocs MDX] Processed Markdown content before `remark-rehype`.
   */
  _markdown?: string;
}

declare module 'vfile' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extend data map
  interface DataMap extends FumadocsDataMap {}
}

/**
 * @param cacheKey - key to cache processor
 * @param source - mdx content
 * @param options - MDX options
 */
export async function buildMDX(
  cacheKey: string,
  source: string,
  options: BuildMDXOptions,
): Promise<VFile> {
  const { filePath, frontmatter, data, _compiler, ...rest } = options;

  function getProcessor(format: 'md' | 'mdx') {
    const key = `${cacheKey}:${format}`;
    let processor = cache.get(key);

    if (!processor) {
      processor = createProcessor({
        outputFormat: 'program',
        ...rest,
        remarkPlugins: [
          remarkInclude,
          ...(rest.remarkPlugins ?? []),
          [
            remarkPostprocess,
            {
              ...options.postprocess,
              valueToExport: [
                ...(options.postprocess?.valueToExport ?? []),
                'structuredData',
                'extractedReferences',
                'frontmatter',
                'lastModified',
                '_markdown',
              ],
            } satisfies PostprocessOptions,
          ],
        ],
        format,
      });

      cache.set(key, processor);
    }

    return processor;
  }

  return getProcessor(
    options.format ?? (filePath.endsWith('.mdx') ? 'mdx' : 'md'),
  ).process({
    value: source,
    path: filePath,
    data: {
      ...data,
      frontmatter,
      _compiler,
      _getProcessor: getProcessor,
    },
  });
}
