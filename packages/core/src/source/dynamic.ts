import type { I18nConfig } from '@/i18n';
import { cache } from 'react';
import { loader, LoaderConfig, LoaderOptions, LoaderOutput } from './loader';
import type { SourceUnion, StaticSource, DynamicSource } from './source';
import { isStaticSource, isDynamicSource } from './source';
import type { GenerateMeta, GeneratePage, GenerateStorage } from './types';
import type { Awaitable } from '@/types';
import { isEqualShallow } from '@/utils/is-equal';

export interface DynamicLoaderConfig extends LoaderConfig {
  source: string | undefined;
}

export interface DynamicLoader<Config extends DynamicLoaderConfig = DynamicLoaderConfig> {
  get: () => Promise<LoaderOutput<Config>>;
  /** invalidate & re-compute dynamic sources immediately */
  revalidate: (source?: Config['source']) => Promise<void>;
  /** remove computed cache of dynamic sources */
  invalidate: (source?: Config['source']) => void;

  get $inferPage(): Config['page'];
  get $inferMeta(): Config['meta'];
}

type ResolvedSource = StaticSource | Record<string, StaticSource>;

/** content loader API for static & dynamic content sources, with in-memory cache. */
export function dynamicLoader<
  I extends SourceUnion | Record<string, SourceUnion>,
  I18n extends I18nConfig | undefined = undefined,
>(
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
  const memoryCache = new Map<DynamicSource, Awaitable<StaticSource>>();

  let initPromise: Promise<void> | undefined;
  async function init() {
    if (isStaticSource(input)) return;
    if (isDynamicSource(input)) {
      await input.configure?.(dynamicLoader);
      return;
    }

    await Promise.all(
      Object.values(input).map(async (v) => {
        if (isDynamicSource(v)) await v.configure?.(dynamicLoader);
      }),
    );
  }

  async function resolveSources(): Promise<ResolvedSource> {
    if (isStaticSource(input) || isDynamicSource(input)) {
      return resolveSource(input);
    }

    const entries = await Promise.all(
      Object.entries(input).map(async ([k, v]) => [k, await resolveSource(v)]),
    );

    return Object.fromEntries(entries);
  }

  function resolveSource(v: StaticSource | DynamicSource): Awaitable<StaticSource> {
    if (isStaticSource(v)) return v;
    const cache = v.cache ?? 'memory';
    if (cache === 'memory') {
      const cached = memoryCache.get(v);
      if (cached) return cached;
    }

    const files = v.files();
    const resolved: Awaitable<StaticSource> =
      'then' in files ? files.then((res) => ({ files: res })) : { files };
    if (cache === 'memory') {
      memoryCache.set(v, resolved);
    }
    return resolved;
  }

  const dynamicLoader: DynamicLoader = {
    get: cache(async () => {
      await (initPromise ??= init());
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
      await (initPromise ??= init());

      dynamicLoader.invalidate(name);

      // rewrite cache, wait until next `get()` to compute `loader()`
      if (name === undefined) {
        await resolveSources();
      } else if (!isStaticSource(input) && !isDynamicSource(input)) {
        await resolveSource(input[name]);
      }
    },
    invalidate(name) {
      if (isStaticSource(input)) return;

      if (name === undefined) {
        memoryCache.clear();

        if (isDynamicSource(input)) {
          input.invalidate?.();
        } else {
          for (const v of Object.values(input)) if (isDynamicSource(v)) v.invalidate?.();
        }
        return;
      }

      if (isDynamicSource(input)) return;

      const s = input[name];
      if (!isDynamicSource(s)) return;
      memoryCache.delete(s);
      s.invalidate?.();
    },
  };

  return dynamicLoader as never;
}

function isEqual(a: ResolvedSource, b: ResolvedSource): boolean {
  if (isStaticSource(a) && isStaticSource(b)) {
    return a === b;
  }

  if (!isStaticSource(a) && !isStaticSource(b)) {
    return Object.keys(b).every((k) => isEqualShallow(a[k].files, b[k].files));
  }

  return false;
}
