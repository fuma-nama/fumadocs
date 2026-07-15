import type { LoaderDefinitionFunction } from 'webpack';
import { createMdxLoader } from '@/loaders/mdx';
import { toWebpack, type WebpackLoader } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { getCore, type WebpackLoaderOptions } from '@/webpack';

let instance: WebpackLoader | undefined;

const loader: LoaderDefinitionFunction<WebpackLoaderOptions> = function loader(source) {
  const callback = this.async();
  const options = this.getOptions();
  this.cacheable(true);
  this.addDependency(options.absoluteCompiledConfigPath);

  if (!instance) {
    instance = toWebpack(
      createMdxLoader(
        createStandaloneConfigLoader({
          core: getCore(options),
          buildConfig: false,
          mode: options.isDev ? 'dev' : 'production',
        }),
      ),
    );
  }

  void instance.call(this, source, callback);
};

export default loader;
