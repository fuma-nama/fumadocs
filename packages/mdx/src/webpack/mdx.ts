import { type LoaderContext } from 'webpack';
import { createMdxLoader } from '@/loaders/mdx';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createCore } from '@/core';
import { createStandaloneConfigLoader } from '@/loaders/config';
import type { WebpackLoaderOptions } from '@/webpack';

let instance: WebpackLoader | undefined;

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
