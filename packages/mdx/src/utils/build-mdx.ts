import type {
  Processor,
  VFile,
} from '@mdx-js/mdx/internal-create-format-aware-processors';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';

const cache = new Map<string, Processor>();

export interface MDXOptions extends ProcessorOptions {
  /**
   * Specify a file path for source
   */
  filePath?: string;

  frontmatter?: Record<string, unknown>;

  /**
   * Custom Vfile data
   */
  data?: Record<string, unknown>;
}

export function buildMDX(
  source: string,
  options: MDXOptions = {},
): Promise<VFile> {
  const { filePath, frontmatter, data, ...rest } = options;

  let format = options.format;
  if (!format && filePath) {
    format = filePath.endsWith('.mdx') ? 'mdx' : 'md';
  }
  format ??= 'mdx';

  let processor = cache.get(format);

  if (processor === undefined) {
    processor = createProcessor({
      development: process.env.NODE_ENV === 'development',
      ...rest,
      format,
    });

    cache.set(format, processor);
  }

  return processor.process({
    value: source,
    path: filePath,
    data: {
      ...data,
      frontmatter,
    },
  });
}
