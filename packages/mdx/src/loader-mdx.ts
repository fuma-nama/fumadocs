import path from 'node:path';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import type { Processor } from '@mdx-js/mdx/lib/core';
import grayMatter from 'gray-matter';
import type { LoaderContext } from 'webpack';

type Options = ProcessorOptions;

export interface NextDocsBuildInfo {
  __next_docs?: {
    path: string;
    /**
     * `vfile.data` parsed from file
     */
    data: unknown;
  };
}

const cache = new Map<string, Processor>();

export default function loader(
  this: LoaderContext<Options>,
  source: string,
  callback: LoaderContext<Options>['callback'],
): void {
  this.cacheable(true);
  const context = this.context;
  const filePath = this.resourcePath;
  const options = this.getOptions();
  const { content, data } = grayMatter(source);
  const config = {
    development: this.mode === 'development',
    ...options,
  };

  const format = config.format ?? filePath.endsWith('.mdx') ? 'mdx' : 'md';
  let processor = cache.get(format);

  if (!processor) {
    processor = createProcessor(config);
    cache.set(format, processor);
  }

  processor.process({ value: content, path: filePath }).then(
    (file) => {
      const result = String(file.value);
      const info = this._module?.buildInfo as NextDocsBuildInfo;

      info.__next_docs = {
        path: this.resourcePath,
        data: file.data,
      };

      const final = `export const frontmatter = ${JSON.stringify(
        data,
      )};\n${result}`;
      callback(undefined, final, file.map || undefined);
    },
    (error: Error) => {
      const fpath = path.relative(context, filePath);
      error.message = `${fpath}:${error.name}: ${error.message}`;
      callback(error);
    },
  );
}
