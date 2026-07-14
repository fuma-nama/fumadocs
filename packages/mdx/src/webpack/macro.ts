import type { LoaderDefinitionFunction } from 'webpack';
import type { WebpackLoaderOptions } from '@/webpack';
import { MacroModuleId, transformMacroModule } from '@/macro/transform';

/**
 * Expand macro calls (`fumadocs-mdx/macro`) into static imports of content files.
 *
 * File filtering happens in the bundler configuration (`include` patterns as
 * Webpack rule conditions/Turbopack rule globs), the loader only skips modules
 * that don't use the macro API.
 */
const loader: LoaderDefinitionFunction<WebpackLoaderOptions> = function (source) {
  const callback = this.async();
  this.cacheable(true);

  void (async () => {
    if (!source.includes(MacroModuleId)) {
      callback(undefined, source);
      return;
    }

    const result = await transformMacroModule({
      code: source,
      file: this.resourcePath,
      root: process.cwd(),
      target: 'import',
    });

    if (!result) {
      callback(undefined, source);
      return;
    }

    // re-run when content files are added/removed
    for (const dir of result.dirs) this.addContextDependency(dir);
    callback(undefined, result.code, result.map as never);
  })().catch((error) => {
    callback(error as Error);
  });
};

export default loader;
