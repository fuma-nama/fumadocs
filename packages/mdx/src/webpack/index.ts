import { type LoaderContext } from 'webpack';
import { createMdxLoader } from '@/loaders/mdx';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createCore } from '@/core';
import { createStandaloneConfigLoader } from '@/loaders/config';

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
        createStandaloneConfigLoader({
          core,
          buildConfig: false,
          mode: isDev ? 'dev' : 'production',
        }),
      ),
    );
  }

  await instance.call(this, source, callback);
}
