import type { I18nConfig } from '@/i18n';
import { cache } from 'react';
import { loader, LoaderConfig, LoaderOptions, LoaderOutput } from './loader';
import type { SourceUnion, StaticSource, DynamicSource, VirtualFile } from './source';
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
  let cachedLoader:
    | {
        input: ResolvedSource;
        value: LoaderOutput<DynamicLoaderConfig>;
      }
    | undefined;
  const memoryCache = new Map<
    DynamicSource,
    {
      value: Awaitable<StaticSource>;
      expires?: number;
    }
  >();

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
    const mapFiles = (files: VirtualFile[]): StaticSource => ({
      baseDir: v.baseDir,
      files,
      configureStatic: v.configureStatic,
    });

    if (!v.cache || v.cache === 'memory') {
      const cached = memoryCache.get(v);
      if (cached && (cached.expires === undefined || Date.now() < cached.expires)) {
        return cached.value;
      }

      const value = Promise.resolve(v.files())
        .then(mapFiles)
        .catch((e) => {
          if (memoryCache.get(v)?.value === value) memoryCache.delete(v);
          throw e;
        });
      memoryCache.set(v, {
        value,
        expires: v.staleTime !== undefined ? Date.now() + v.staleTime : undefined,
      });
      return value;
    }

    return Promise.resolve(v.files()).then(mapFiles);
  }

  const dynamicLoader: DynamicLoader = {
    get: cache(async () => {
      const resolved = await resolveSources();

      if (cachedLoader && isEqual(cachedLoader.input, resolved)) {
        return cachedLoader.value;
      }

      cachedLoader = {
        input: resolved,
        value: loader(resolved, options as never) as unknown as LoaderOutput<DynamicLoaderConfig>,
      };
      return cachedLoader.value;
    }),
    $inferPage: undefined as never,
    $inferMeta: undefined as never,
    async revalidate(name) {
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

  if (isDynamicSource(input) || isStaticSource(input)) {
    input.configureDynamic?.({ loader: dynamicLoader });
    if (isDynamicSource(input)) input.configure?.(dynamicLoader, {});
  } else {
    for (const [k, v] of Object.entries(input)) {
      v.configureDynamic?.({ loader: dynamicLoader, source: k });
      if (isDynamicSource(v)) v.configure?.(dynamicLoader, { source: k });
    }
  }

  return dynamicLoader as never;
}

function isEqual(a: ResolvedSource, b: ResolvedSource): boolean {
  if (isStaticSource(a) && isStaticSource(b)) {
    return isEqualShallow(a.files, b.files);
  }

  if (!isStaticSource(a) && !isStaticSource(b)) {
    return Object.keys(b).every((k) => isEqualShallow(a[k].files, b[k].files));
  }

  return false;
}
