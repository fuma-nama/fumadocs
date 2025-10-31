import { type LoaderContext } from 'webpack';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createCore } from '@/core';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import type { WebpackLoaderOptions } from '@/webpack';

let instance: WebpackLoader | undefined;

// TODO: currently unused, it's too intrusive and consuming for Turbopack
// It can be invoked for many JSON files in multiple processes, hence repeatedly loading the config file
// the cost of loading the loader itself is higher than transforming the actual content, hence parallelization isn't very useful.
export default async function loader(
  this: LoaderContext<WebpackLoaderOptions>,
  source: string,
  callback: LoaderContext<WebpackLoaderOptions>['callback'],
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
      createMetaLoader(
        createStandaloneConfigLoader({
          core,
          buildConfig: false,
          mode: isDev ? 'dev' : 'production',
        }),
        {
          json: 'json',
          yaml: 'yaml',
        },
      ),
    );
  }

  await instance.call(this, source, callback);
}
