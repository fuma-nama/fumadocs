import { type ReactNode, type FC, use } from 'react';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DocCollection, DocsCollection } from '@/config/define';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import type { Params } from 'fumadocs-core/source';
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

/** `params`: for a file of a dynamic path, the params of the page, like `page.params` of the loader */
export interface ClientLoader<Doc, Props> {
  preload: (path: string, params?: Params) => Promise<Doc>;
  /**
   * Get a component that renders content with `use()`.
   */
  getComponent: (path: string, params?: Params) => FC<Props>;
  /**
   * Get react nodes that renders content.
   */
  useContent: undefined extends Props
    ? (path: string, props?: Props, params?: Params) => ReactNode
    : (path: string, props: Props, params?: Params) => ReactNode;
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

  /** a page is its file at its params, the same page for the same params */
  const keyOf = (path: string, params?: Params) =>
    params ? `${path}?${JSON.stringify(params)}` : path;

  async function load(path: string, params?: Params): Promise<PageAt<Doc>> {
    const loader = loaders.get(path);
    if (!loader)
      throw new Error(`[createClientLoader] ${path} does not exist in available entries`);
    return pageAt(await loader(), params);
  }

  function getRenderer(path: string, params?: Params): FC<Props> {
    const key = keyOf(path, params);
    if (key in renderers) return renderers[key];

    let promise: Promise<PageAt<Doc>> | undefined;
    function Renderer(props: Props) {
      let doc = store.preloaded.get(key) as PageAt<Doc> | undefined;
      doc ??= use((promise ??= load(path, params)));

      return useRenderer(doc, props);
    }

    return (renderers[key] = Renderer);
  }

  return {
    async preload(path, params) {
      const loaded = await load(path, params);
      store.preloaded.set(keyOf(path, params), loaded as never);
      return loaded;
    },
    getComponent: getRenderer,
    useContent(path: string, props: Props & object, params?: Params) {
      const Comp = getRenderer(path, params);
      return <Comp {...props} />;
    },
  } as ClientLoader<PageAt<Doc>, Props>;
}
