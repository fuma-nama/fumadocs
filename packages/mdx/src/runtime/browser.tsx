import { type ReactNode, type FC, use } from 'react';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DocCollection, DocsCollection } from '@/config/define';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import type { InternalTypeConfig } from './types';
import { pageAt, type PageAt } from '@/utils/page';

type CompiledMDXFile<
  Name extends string,
  Frontmatter,
  TC extends InternalTypeConfig,
> = CompiledMDXProperties<Frontmatter> & TC['DocData'][Name] & Record<string, unknown>;

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
   * Get a component that renders content with `use()`.
   */
  getComponent: (path: string) => FC<Props>;
  /**
   * Get react nodes that renders content.
   */
  useContent: undefined extends Props
    ? (path: string, props?: Props) => ReactNode
    : (path: string, props: Props) => ReactNode;
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

  createClientLoader: <Props extends object | undefined = undefined>(
    options: ClientLoaderOptions<PageAt<CompiledMDXFile<Name, Frontmatter, TC>>, Props>,
  ) => ClientLoader<PageAt<CompiledMDXFile<Name, Frontmatter, TC>>, Props>;
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

      return out as Config[Name] extends DocCollection<infer Schema> | DocsCollection<infer Schema>
        ? DocCollectionEntry<Name, StandardSchemaV1.InferOutput<Schema>, TC>
        : never;
    },
  };
}

const loaderStore = new Map<
  string,
  {
    preloaded: Map<string, PageAt<CompiledMDXProperties>>;
  }
>();

export function createClientLoader<
  Doc extends CompiledMDXProperties<unknown> = CompiledMDXProperties,
  Props extends object | undefined = undefined,
>(
  globEntries: Record<string, () => Promise<Doc>>,
  options: ClientLoaderOptions<PageAt<Doc>, Props>,
): ClientLoader<PageAt<Doc>, Props> {
  const { id = '', component: useRenderer } = options;
  const renderers: Record<string, FC<Props>> = {};
  const loaders = new Map<string, () => Promise<Doc>>();
  const store = loaderStore.get(id) ?? {
    preloaded: new Map(),
  };
  loaderStore.set(id, store);

  for (const k in globEntries) {
    loaders.set(k.startsWith('./') ? k.slice(2) : k, globEntries[k]);
  }

  /** the page of a path, its outputs resolved */
  async function load(path: string): Promise<PageAt<Doc>> {
    const loader = loaders.get(path);
    if (!loader)
      throw new Error(`[createClientLoader] ${path} does not exist in available entries`);
    return pageAt(await loader(), {});
  }

  function getRenderer(path: string): FC<Props> {
    if (path in renderers) return renderers[path];

    let promise: Promise<PageAt<Doc>> | undefined;
    function Renderer(props: Props) {
      let doc = store.preloaded.get(path) as PageAt<Doc> | undefined;
      doc ??= use((promise ??= load(path)));

      return useRenderer(doc, props);
    }

    return (renderers[path] = Renderer);
  }

  return {
    async preload(path) {
      const loaded = await load(path);
      store.preloaded.set(path, loaded as never);
      return loaded;
    },
    getComponent(path) {
      return getRenderer(path);
    },
    useContent(path: string, props: Props & object) {
      const Comp = getRenderer(path);
      return <Comp {...props} />;
    },
  } as ClientLoader<PageAt<Doc>, Props>;
}
