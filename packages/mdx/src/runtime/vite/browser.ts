import type { CompiledMDXFile } from '@/runtime/vite/types';
import { createElement, type FC, lazy, type ReactNode } from 'react';

export { fromConfigBase as fromConfig } from './base';

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

type ClientRenderer<Props> = Record<string, FC<Props>>;

export interface ClientLoader<Frontmatter, Props> {
  preload: (path: string) => Promise<CompiledMDXFile<Frontmatter>>;
  /**
   * Get a component that renders content with `React.lazy`
   */
  getComponent: (path: string) => FC<Props>;

  getRenderer: () => ClientRenderer<Props>;
}

const loaderStore = new Map<
  string,
  {
    preloaded: Map<string, CompiledMDXFile<any>>;
  }
>();

export function createClientLoader<Frontmatter, Props = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  options: ClientLoaderOptions<Frontmatter, Props>,
): ClientLoader<Frontmatter, Props> {
  const { id = '', component } = options;
  let renderer: ClientRenderer<Props> | undefined;
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
  };
}

export function toClientRenderer<Frontmatter, Props = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  component: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode,
): ClientRenderer<Props> {
  return createClientLoader(files, { component }).getRenderer();
}
