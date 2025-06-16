import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import type { VFile } from 'vfile';
import { remarkInclude } from '@/mdx-plugins/remark-include';

type Processor = ReturnType<typeof createProcessor>;

const cache = new Map<string, Processor>();

export interface MDXOptions extends ProcessorOptions {
  /**
   * Name of collection
   */
  collection?: string;

  /**
   * Specify a file path for source
   */
  filePath?: string;

  frontmatter?: Record<string, unknown>;

  /**
   * Custom Vfile data
   */
  data?: Record<string, unknown>;

  _compiler?: CompilerOptions;
}

export interface CompilerOptions {
  addDependency: (file: string) => void;
}

declare module 'vfile' {
  interface DataMap {
    /**
     * The compiler object from loader
     */
    _compiler?: CompilerOptions;
  }
}

/**
 * @param cacheKey -- key to cache processor
 * @param source - mdx content
 * @param options - MDX options
 */
export async function buildMDX(
  cacheKey: string,
  source: string,
  options: MDXOptions,
): Promise<VFile> {
  const { filePath, frontmatter, data, ...rest } = options;

  let format = options.format;
  if (!format && filePath) {
    format = filePath.endsWith('.mdx') ? 'mdx' : 'md';
  }
  format ??= 'mdx';
  const key = `${cacheKey}:${format}`;
  let cached = cache.get(key);

  if (!cached) {
    cached = createProcessor({
      outputFormat: 'program',
      ...rest,
      remarkPlugins: [remarkInclude, ...(rest.remarkPlugins ?? [])],
      format,
    });

    cache.set(key, cached);
  }

  return cached.process({
    value: source,
    path: filePath,
    data: {
      ...data,
      frontmatter,
      _compiler: options._compiler,
    },
  });
}
