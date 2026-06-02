import type { I18nConfig } from '@/i18n';
import { cache } from 'react';
import { loader, LoaderConfig, LoaderOptions, LoaderOutput } from './loader';
import type { SourceUnion, StaticSource, DynamicSource } from './source';
import { isStaticSource, isDynamicSource } from './source';
import type { GenerateMeta, GeneratePage, GenerateStorage } from './types';
import type { Awaitable } from '@/types';

type Input = SourceUnion | Record<string, SourceUnion>;
export interface DynamicLoaderConfig extends LoaderConfig {
  source: string | undefined;
}

export interface DynamicLoader<Config extends DynamicLoaderConfig = DynamicLoaderConfig> {
  get: () => Promise<LoaderOutput<Config>>;
  /** update & re-compute dynamic sources */
  revalidate: (source?: Config['source']) => Promise<void>;
  /** remove computed cache of dynamic sources */
  invalidate: (source?: Config['source']) => void;

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
  let loaderCache: LoaderOutput<DynamicLoaderConfig> | undefined;
  const sourceCache = new Map<DynamicSource, Awaitable<StaticSource>>();

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

  async function resolveSources(skipCache = false): Promise<ResolvedSource> {
    if (isStaticSource(input) || isDynamicSource(input)) {
      return resolveSource(input, skipCache);
    }

    const entries = await Promise.all(
      Object.entries(input).map(async ([k, v]) => [k, await resolveSource(v, skipCache)]),
    );

    return Object.fromEntries(entries);
  }

  function resolveSource(
    v: StaticSource | DynamicSource,
    skipCache = false,
  ): Awaitable<StaticSource> {
    if (isStaticSource(v)) return v;

    let resolved = skipCache ? undefined : sourceCache.get(v);
    if (resolved) return resolved;

    const files = v.files();
    if ('then' in files) resolved = files.then((res) => ({ files: res }));
    else resolved = { files };

    sourceCache.set(v, resolved);
    return resolved;
  }

  const dynamicLoader: DynamicLoader = {
    get: cache(async () => {
      const resolved = await resolveSources();

      if (loaderCacheKey && isEqual(loaderCacheKey, resolved)) {
        return loaderCache!;
      }

      loaderCacheKey = resolved;
      loaderCache = loader(
        resolved,
        options as never,
      ) as unknown as LoaderOutput<DynamicLoaderConfig>;
      return loaderCache;
    }),
    $inferPage: undefined as never,
    $inferMeta: undefined as never,
    async revalidate(name) {
      // rewrite cache, wait until next `get()` to compute `loader()`
      if (name === undefined) {
        await resolveSources(true);
      } else if (!isStaticSource(input) && !isDynamicSource(input)) {
        await resolveSource(input[name], true);
      }
    },
    invalidate(name) {
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
