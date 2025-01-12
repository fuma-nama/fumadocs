import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import type { VFile } from 'vfile';
import { remarkInclude } from '@/mdx-plugins/remark-include';

type Processor = ReturnType<typeof createProcessor>;

const cache = new Map<string, { processor: Processor; configHash: string }>();

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

function cacheKey(group: string, format: string): string {
  return `${group}:${format}`;
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
 * @param group - The cache group of MDX content, usually the collection name
 * @param configHash - config hash
 * @param source - mdx content
 * @param options - MDX options
 */
export function buildMDX(
  group: string,
  configHash: string,
  source: string,
  options: MDXOptions = {},
): Promise<VFile> {
  const { filePath, frontmatter, data, ...rest } = options;

  let format = options.format;
  if (!format && filePath) {
    format = filePath.endsWith('.mdx') ? 'mdx' : 'md';
  }
  format ??= 'mdx';

  const key = cacheKey(group, format);
  let cached = cache.get(key);

  if (cached === undefined || cached.configHash !== configHash) {
    cached = {
      processor: createProcessor({
        outputFormat: 'program',
        development: process.env.NODE_ENV === 'development',
        ...rest,
        remarkPlugins: [remarkInclude, ...(rest.remarkPlugins ?? [])],
        format,
      }),

      configHash,
    };

    cache.set(key, cached);
  }

  return cached.processor.process({
    value: source,
    path: filePath,
    data: {
      ...data,
      frontmatter,
      _compiler: options._compiler,
    },
  });
}
