import { type LoaderContext } from 'webpack';
import { createMdxLoader } from '@/loaders/mdx';
import { dynamicConfig, staticConfig } from '@/loaders/config';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createCore } from '@/core';

export interface Options {
  configPath: string;
  outDir: string;
  isDev: boolean;
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
  const { isDev, outDir, configPath } = this.getOptions();
  this.cacheable(true);
  this.addDependency(configPath);

  if (!instance) {
    const core = createCore({
      environment: 'webpack',
      outDir,
      configPath,
    });

    instance = toWebpack(
      createMdxLoader(
        isDev
          ? dynamicConfig({
              core,
              buildConfig: false,
            })
          : staticConfig({
              core,
              buildConfig: false,
            }),
      ),
    );
  }

  await instance.call(this, source, callback);
}
