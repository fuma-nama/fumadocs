import { type LoaderContext } from 'webpack';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { getCore, type WebpackLoaderOptions } from '@/webpack';

let instance: WebpackLoader | undefined;

// TODO: improve the performance, this loader is also used for other json/yaml files that's not in a Fumadocs MDX collection.
export default async function loader(
  this: LoaderContext<WebpackLoaderOptions>,
  source: string,
  callback: LoaderContext<WebpackLoaderOptions>['callback'],
): Promise<void> {
  const { isDev, configPath } = this.getOptions();
  this.cacheable(true);
  this.addDependency(configPath);

  if (!instance) {
    instance = toWebpack(
      createMetaLoader(
        createStandaloneConfigLoader({
          core: getCore(this.getOptions()),
          buildConfig: false,
          mode: isDev ? 'dev' : 'production',
        }),
        {
          json: 'json',
          yaml: 'js',
        },
      ),
    );
  }

  await instance.call(this, source, callback);
}
