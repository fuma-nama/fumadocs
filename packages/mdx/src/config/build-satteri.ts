import type { MdxCompileOptions } from 'satteri';
import type { SatteriPresetOptions } from '@fumadocs/satteri';
import { applySatteriPreset } from '@fumadocs/satteri';
import type { BuildEnvironment, DocCollectionItem, LoadedConfig } from '@/config/build';

const satteriOptionsCache = new WeakMap<
  LoadedConfig,
  Map<string, MdxCompileOptions | Promise<MdxCompileOptions>>
>();

export function getSatteriOptions(
  config: LoadedConfig,
  collection?: DocCollectionItem,
  environment: BuildEnvironment = 'bundler',
): MdxCompileOptions | Promise<MdxCompileOptions> {
  let cache = satteriOptionsCache.get(config);
  if (!cache) {
    cache = new Map();
    satteriOptionsCache.set(config, cache);
  }

  const key = collection ? `${environment}:${collection.name}` : environment;
  const cached = cache.get(key);
  if (cached) return cached;

  let result: MdxCompileOptions | Promise<MdxCompileOptions>;

  if (collection?.compiler === 'satteri') {
    const opts = collection.satteriOptions;
    if (typeof opts === 'function') {
      result = (opts as (env: BuildEnvironment) => Promise<SatteriPresetOptions>)(environment).then(
        (options) => applySatteriPreset(options)(environment),
      );
    } else if (opts) {
      result = applySatteriPreset(opts as SatteriPresetOptions)(environment);
    } else {
      result = (async () => {
        const optionsFn = config.global.satteriOptions;
        const options =
          typeof optionsFn === 'function'
            ? await (optionsFn as () => Promise<SatteriPresetOptions>)()
            : (optionsFn as SatteriPresetOptions | undefined);
        return applySatteriPreset(options)(environment);
      })();
    }
  } else if (collection) {
    throw new Error(
      `Collection "${collection.name}" uses the default MDX compiler. Use getMDXOptions() instead of getSatteriOptions().`,
    );
  } else {
    result = (async () => {
      const optionsFn = config.global.satteriOptions;
      const options =
        typeof optionsFn === 'function'
          ? await (optionsFn as () => Promise<SatteriPresetOptions>)()
          : (optionsFn as SatteriPresetOptions | undefined);
      return applySatteriPreset(options)(environment);
    })();
  }

  cache.set(key, result);
  return result;
}
