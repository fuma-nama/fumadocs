import { type LoaderContext } from 'webpack';
import { createMdxLoader } from '@/loaders/mdx';
import { dynamicConfig } from '@/loaders/config';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';

export interface Options {
  configPath: string;
  outDir: string;
}

let instance: WebpackLoader | undefined;

/**
 * Load MDX/markdown files
 *
 * it supports frontmatter by parsing and injecting the data in `vfile.data.frontmatter`
 */
export default async function loader(
  this: LoaderContext<Options>,
  source: string,
  callback: LoaderContext<Options>['callback'],
): Promise<void> {
  this.cacheable(true);
  const { configPath, outDir } = this.getOptions();
  instance ??= toWebpack(createMdxLoader(dynamicConfig(configPath, outDir)));

  await instance.call(this, source, callback);
}
