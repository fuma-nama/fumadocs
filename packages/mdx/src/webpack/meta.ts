import { LoaderDefinitionFunction } from 'webpack';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { getCore, type WebpackLoaderOptions } from '@/webpack';

let instance: WebpackLoader | undefined;

const loader: LoaderDefinitionFunction<WebpackLoaderOptions> = function (source) {
  const callback = this.async();
  const options = this.getOptions();
  this.cacheable(true);
  this.addDependency(options.absoluteCompiledConfigPath);

  if (!instance) {
    instance = toWebpack(
      createMetaLoader(
        createStandaloneConfigLoader({
          core: getCore(options),
          buildConfig: false,
          mode: options.isDev ? 'dev' : 'production',
        }),
        {
          json: 'json',
          yaml: 'js',
        },
      ),
    );
  }

  void instance.call(this, source, callback);
};

export default loader;
