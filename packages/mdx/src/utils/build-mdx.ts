import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import type { DataMap, VFile } from 'vfile';
import { remarkInclude } from '@/mdx-plugins/remark-include';

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
}

export interface CompilerOptions {
  addDependency: (file: string) => void;
}

export type { DataMap };

declare module 'vfile' {
  interface DataMap {
    /**
     * The compiler object from loader
     */
    _compiler?: CompilerOptions;

    _processor?: {
      getProcessor: (format: 'md' | 'mdx') => Processor;
    };
  }
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
        remarkPlugins: [remarkInclude, ...(rest.remarkPlugins ?? [])],
        format,
      });

      cache.set(key, processor);
    }

    return processor;
  }

  return getProcessor(
    (options.format ?? filePath.endsWith('.mdx')) ? 'mdx' : 'md',
  ).process({
    value: source,
    path: filePath,
    data: {
      ...data,
      frontmatter,
      _compiler,
      _processor: {
        getProcessor,
      },
    },
  });
}
