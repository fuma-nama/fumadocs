import { type ReactNode, type FC, lazy, createElement } from 'react';
import type { CompiledMDXFile } from './server';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DocCollection, DocsCollection } from '@/config/define';

export interface ClientLoaderOptions<Frontmatter, Props> {
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

  component: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode;
}

export interface ClientLoader<Frontmatter, Props> {
  preload: (path: string) => Promise<CompiledMDXFile<Frontmatter>>;
  /**
   * Get a component that renders content with `React.lazy`.
   */
  getComponent: (path: string) => FC<Props>;

  /**
   * Get react nodes that renders content with `React.lazy`.
   */
  useContent: (path: string, props: Props) => ReactNode;
}

export type BrowserCreate<Config> = ReturnType<typeof fromConfig<Config>>;

export interface DocCollectionEntry<Frontmatter> {
  raw: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>;
  createClientLoader: <Props extends object>(
    options: ClientLoaderOptions<Frontmatter, Props>,
  ) => ClientLoader<Frontmatter, Props>;
}

export function fromConfig<Config>() {
  return {
    doc<Name extends keyof Config>(
      _name: Name,
      glob: Record<string, () => Promise<unknown>>,
    ) {
      const raw = glob as Record<
        string,
        () => Promise<CompiledMDXFile<unknown>>
      >;

      const out: DocCollectionEntry<unknown> = {
        raw,
        createClientLoader({ id = _name as string, ...options }) {
          return createClientLoader(raw, { id, ...options });
        },
      };

      return out as Config[Name] extends
        | DocCollection<infer Schema>
        | DocsCollection<infer Schema>
        ? DocCollectionEntry<StandardSchemaV1.InferOutput<Schema>>
        : never;
    },
  };
}

const loaderStore = new Map<
  string,
  {
    preloaded: Map<string, CompiledMDXFile<any>>;
  }
>();

export function createClientLoader<Frontmatter, Props extends object = object>(
  globEntries: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  options: ClientLoaderOptions<Frontmatter, Props>,
): ClientLoader<Frontmatter, Props> {
  const { id = '', component } = options;
  const renderers: Record<string, FC<Props>> = {};
  const loaders = new Map<
    string,
    () => Promise<CompiledMDXFile<Frontmatter>>
  >();
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
