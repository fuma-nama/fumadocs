import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import { createElement, type FC, lazy, type ReactNode } from 'react';

export type CompiledMDXFile<Frontmatter> = CompiledMDXProperties<Frontmatter> &
  Record<string, unknown>;

export type DocMap<Frontmatter> = Record<
  string,
  (() => Promise<CompiledMDXFile<Frontmatter>>) & { base: string }
>;

export type MetaMap<Data> = Record<
  string,
  (() => Promise<Data>) & { base: string }
>;

export interface LazyDocMap<Frontmatter> {
  base: string;
  head: Record<string, () => Promise<Frontmatter>>;
  body: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>;
}

export interface BaseCreate<Config> {
  doc: <Name extends keyof Config>(
    name: Name,
    base: string,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? DocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  docLazy: <Name extends keyof Config>(
    name: Name,
    base: string,
    headGlob: Record<string, () => Promise<unknown>>,
    bodyGlob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? LazyDocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  meta: <Name extends keyof Config>(
    name: Name,
    base: string,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | MetaCollection<infer Schema>
    | DocsCollection<StandardSchemaV1, infer Schema>
    ? MetaMap<StandardSchemaV1.InferOutput<Schema>>
    : never;
}

export function fromConfigBase<Config>(): BaseCreate<Config> {
  function normalize<T>(entries: Record<string, T>, base?: string) {
    const out: Record<string, T> = {};

    for (const k in entries) {
      const mappedK = k.startsWith('./') ? k.slice(2) : k;

      if (base) Object.assign(entries[k] as object, { base });
      out[mappedK] = entries[k];
    }

    return out;
  }

  return {
    doc(_, base, glob) {
      return normalize(glob, base) as any;
    },
    meta(_, base, glob) {
      return normalize(glob, base) as any;
    },
    docLazy(_, base, head, body) {
      return {
        base,
        head: normalize(head),
        body: normalize(body),
      } as any;
    },
  };
}

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

  getRenderer: () => Record<string, FC<Props>>;
}

const loaderStore = new Map<
  string,
  {
    preloaded: Map<string, CompiledMDXFile<any>>;
  }
>();

export function createClientLoader<Frontmatter, Props extends object = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  options: ClientLoaderOptions<Frontmatter, Props>,
): ClientLoader<Frontmatter, Props> {
  const { id = '', component } = options;
  let renderer: Record<string, FC<Props>> | undefined;
  const store = loaderStore.get(id) ?? {
    preloaded: new Map(),
  };
  loaderStore.set(id, store);

  function getRenderer() {
    if (renderer) return renderer;

    renderer = {};
    for (const k in files) {
      const OnDemand = lazy(async () => {
        const loaded = await files[k]();
        return { default: (props) => component(loaded, props) };
      });

      renderer[k] = (props: Props) => {
        const cached = store.preloaded.get(k);
        if (!cached) return createElement(OnDemand, props);
        return component(cached, props);
      };
    }

    return renderer;
  }

  return {
    async preload(path) {
      const loaded = await files[path]();
      store.preloaded.set(path, loaded);
      return loaded;
    },
    getRenderer,
    getComponent(path) {
      return getRenderer()[path];
    },
    useContent(path, props) {
      const Comp = this.getComponent(path);
      return createElement(Comp, props);
    },
  };
}

export function toClientRenderer<Frontmatter, Props extends object = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  component: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode,
): Record<string, FC<Props>> {
  return createClientLoader(files, { component }).getRenderer();
}
