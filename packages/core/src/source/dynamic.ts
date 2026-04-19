import type { I18nConfig } from '@/i18n';
import { cache } from 'react';
import { loader, LoaderConfig, LoaderOptions, LoaderOutput } from './loader';
import type { SourceUnion, StaticSource, DynamicSource } from './source';
import { isStaticSource, isDynamicSource } from './source';
import type { GenerateMeta, GeneratePage, GenerateStorage } from './types';

type Input = SourceUnion | Record<string, SourceUnion>;
export interface DynamicLoaderConfig extends LoaderConfig {
  source: string | undefined;
}

export interface DynamicLoader<Config extends DynamicLoaderConfig = DynamicLoaderConfig> {
  get: () => Promise<LoaderOutput<Config>>;
  revalidate: (source?: Config['source']) => void;

  get $inferPage(): Config['page'];
  get $inferMeta(): Config['meta'];
}

type ResolvedSource = StaticSource | Record<string, StaticSource>;

export function dynamicLoader<I extends Input, I18n extends I18nConfig | undefined = undefined>(
  input: I,
  options: LoaderOptions<NoInfer<GenerateStorage<I>>, I18n>,
): DynamicLoader<{
  i18n: I18n;
  meta: NoInfer<GenerateMeta<I>>;
  page: NoInfer<GeneratePage<I>>;
  source: I extends Record<infer K, SourceUnion> ? K : undefined;
}> {
  let loaderCacheKey: ResolvedSource | undefined;
  let loaderCache: LoaderOutput | undefined;
  const sourceCache = new Map<DynamicSource, Promise<StaticSource>>();

  function configureSources() {
    if (isStaticSource(input)) return;
    if (isDynamicSource(input)) {
      input.configure?.(dynamicLoader);
      return;
    }

    for (const v of Object.values(input)) {
      if (isDynamicSource(v)) v.configure?.(dynamicLoader);
    }
  }

  async function resolveSources(): Promise<ResolvedSource> {
    if (isStaticSource(input)) return input;
    if (isDynamicSource(input)) return resolveDynamicSource(input);

    const entries = await Promise.all(
      Object.entries(input).map(async ([k, v]): Promise<[string, StaticSource]> => {
        if (isStaticSource(v)) return [k, v];
        return [k, await resolveDynamicSource(v)];
      }),
    );

    return Object.fromEntries(entries);
  }

  function resolveDynamicSource(v: DynamicSource): Promise<StaticSource> {
    let resolved = sourceCache.get(v);
    if (resolved) return resolved;

    resolved = Promise.resolve(v.files()).then((res) => ({ files: res }));
    sourceCache.set(v, resolved);
    return resolved;
  }

  const dynamicLoader: DynamicLoader = {
    get: cache(async () => {
      const resolved = await resolveSources();

      if (loaderCacheKey && isEqual(loaderCacheKey, resolved)) {
        return loaderCache as LoaderOutput<any>;
      }

      loaderCacheKey = resolved;
      loaderCache = loader(resolved, options as never) as LoaderOutput;
      return loaderCache as LoaderOutput<any>;
    }),
    $inferPage: undefined as never,
    $inferMeta: undefined as never,
    revalidate(name) {
      if (name === undefined) {
        sourceCache.clear();
      } else if (!isStaticSource(input) && !isDynamicSource(input)) {
        const s = input[name];
        if (isDynamicSource(s)) sourceCache.delete(s);
      }
    },
  };

  configureSources();

  return dynamicLoader as never;
}

function isEqual(a: ResolvedSource, b: ResolvedSource): boolean {
  if (isStaticSource(a) && isStaticSource(b)) {
    return a === b;
  }

  if (!isStaticSource(a) && !isStaticSource(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every((k) => a[k] === b[k]);
  }

  return false;
}
