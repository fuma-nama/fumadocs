import type { MdxCompileOptions } from 'satteri';
import { applySatteriPreset, type SatteriPresetOptions } from '@fumadocs/satteri/preset';
import type { BuildEnvironment, DocCollectionItem, LoadedConfig } from '@/config/build';

const satteriOptionsCache = new WeakMap<
  LoadedConfig,
  Map<string, MdxCompileOptions | Promise<MdxCompileOptions>>
>();

type SatteriOptionsInput =
  | SatteriPresetOptions
  | ((environment: BuildEnvironment) => SatteriPresetOptions | Promise<SatteriPresetOptions>)
  | undefined;

async function resolvePresetOptions(
  input: SatteriOptionsInput,
  environment: BuildEnvironment,
): Promise<MdxCompileOptions> {
  const options = typeof input === 'function' ? await input(environment) : input;
  return applySatteriPreset(options)(environment);
}

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
    result = resolvePresetOptions(
      (collection.satteriOptions ?? config.global.satteriOptions) as SatteriOptionsInput,
      environment,
    );
  } else if (collection) {
    throw new Error(
      `Collection "${collection.name}" uses the default MDX compiler. Use getMDXOptions() instead of getSatteriOptions().`,
    );
  } else {
    result = resolvePresetOptions(config.global.satteriOptions as SatteriOptionsInput, environment);
  }

  cache.set(key, result);
  return result;
}
