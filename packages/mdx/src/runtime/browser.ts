import { type ReactNode, type FC, lazy, createElement } from 'react';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DocCollection, DocsCollection } from '@/config/define';
import type { CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import type { InternalTypeConfig } from './types';

type CompiledMDXFile<
  Name extends string,
  Frontmatter,
  TC extends InternalTypeConfig,
> = CompiledMDXProperties<Frontmatter> &
  TC['DocData'][Name] &
  Record<string, unknown>;

export interface ClientLoaderOptions<Doc, Props> {
  /**
   * Loader ID (usually your collection name)
   *
   * The code splitting strategy of frameworks like Tanstack Start may duplicate `createClientLoader()` into different chunks.
   *
   * We use loader ID to share cache between multiple instances of client loader.
   *
   * @defaultValue ''
   */
  id?: string;

  component: (loaded: Doc, props: Props) => ReactNode;
}

export interface ClientLoader<Doc, Props> {
  preload: (path: string) => Promise<Doc>;
  /**
   * Get a component that renders content with `React.lazy`.
   */
  getComponent: (path: string) => FC<Props>;

  /**
   * Get react nodes that renders content with `React.lazy`.
   */
  useContent: (path: string, props: Props) => ReactNode;
}

export type BrowserCreate<Config, TC extends InternalTypeConfig> = ReturnType<
  typeof browser<Config, TC>
>;

export interface DocCollectionEntry<
  Name extends string = string,
  Frontmatter = unknown,
  TC extends InternalTypeConfig = InternalTypeConfig,
> {
  raw: Record<string, () => Promise<CompiledMDXFile<Name, Frontmatter, TC>>>;

  createClientLoader: <Props extends object>(
    options: ClientLoaderOptions<CompiledMDXFile<Name, Frontmatter, TC>, Props>,
  ) => ClientLoader<CompiledMDXFile<Name, Frontmatter, TC>, Props>;
}

export function browser<Config, TC extends InternalTypeConfig>() {
  return {
    doc<Name extends keyof Config & string>(
      _name: Name,
      glob: Record<string, () => Promise<unknown>>,
    ) {
      const out: DocCollectionEntry = {
        raw: glob as DocCollectionEntry['raw'],
        createClientLoader({ id = _name as string, ...options }) {
          return createClientLoader(this.raw, { id, ...options });
        },
      };

      return out as Config[Name] extends
        | DocCollection<infer Schema>
        | DocsCollection<infer Schema>
        ? DocCollectionEntry<Name, StandardSchemaV1.InferOutput<Schema>, TC>
        : never;
    },
  };
}

const loaderStore = new Map<
  string,
  {
    preloaded: Map<string, CompiledMDXProperties>;
  }
>();

export function createClientLoader<
  Doc = CompiledMDXProperties,
  Props extends object = object,
>(
  globEntries: Record<string, () => Promise<Doc>>,
  options: ClientLoaderOptions<Doc, Props>,
): ClientLoader<Doc, Props> {
  const { id = '', component } = options;
  const renderers: Record<string, FC<Props>> = {};
  const loaders = new Map<string, () => Promise<Doc>>();
  const store = loaderStore.get(id) ?? {
    preloaded: new Map(),
  };
  loaderStore.set(id, store);

  for (const k in globEntries) {
    loaders.set(k.startsWith('./') ? k.slice(2) : k, globEntries[k]);
  }

  function getLoader(path: string) {
    const loader = loaders.get(path);
    if (!loader)
      throw new Error(
        `[createClientLoader] ${path} does not exist in available entries`,
      );
    return loader;
  }

  function getRenderer(path: string): FC<Props> {
    if (path in renderers) return renderers[path];

    const OnDemand = lazy(async () => {
      const loaded = await getLoader(path)();

      return { default: (props) => component(loaded, props) };
    });

    renderers[path] = (props) => {
      const cached = store.preloaded.get(path);
      if (!cached) return createElement(OnDemand, props);
      return component(cached, props);
    };
    return renderers[path];
  }

  return {
    async preload(path) {
      const loaded = await getLoader(path)();
      store.preloaded.set(path, loaded);
      return loaded;
    },
    getComponent(path) {
      return getRenderer(path);
    },
    useContent(path, props) {
      const Comp = this.getComponent(path);
      return createElement(Comp, props);
    },
  };
}
