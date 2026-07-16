import { LoaderDefinitionFunction } from 'webpack';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { getCore, type WebpackLoaderOptions } from '@/webpack';

const instances = new Map<'json' | 'js', WebpackLoader>();

const loader: LoaderDefinitionFunction<WebpackLoaderOptions> = function (source) {
  const callback = this.async();
  const options = this.getOptions();
  this.cacheable(true);
  this.addDependency(options.compiledConfigPath);

  // TODO: output json directly when Turbopack supports output format other than JavaScript.
  const jsonOutput = options.type === 'turbopack' ? 'js' : 'json';
  let instance = instances.get(jsonOutput);
  if (!instance) {
    instance = toWebpack(
      createMetaLoader(
        createStandaloneConfigLoader({
          core: getCore(options),
          buildConfig: false,
          mode: options.isDev ? 'dev' : 'production',
        }),
        {
          json: jsonOutput,
          yaml: 'js',
        },
      ),
    );
    instances.set(jsonOutput, instance);
  }

  void instance.call(this, source, callback);
};

export default loader;
