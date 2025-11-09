import { type ReactNode, type FC, lazy, createElement } from 'react';
import type { CompiledMDXFile } from './server';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  DocCollection,
  DocsCollection,
  MetaCollection,
} from '@/config/define';

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

export type BrowserCreate<Config> = ReturnType<typeof fromConfig<Config>>;

export function fromConfig<Config>() {
  return {
    doc<Name extends keyof Config>(
      _name: Name,
      glob: Record<string, () => Promise<unknown>>,
    ): Config[Name] extends
      | DocCollection<infer Schema>
      | DocsCollection<infer Schema>
      ? Promise<
          Record<
            string,
            () => Promise<CompiledMDXFile<StandardSchemaV1.InferOutput<Schema>>>
          >
        >
      : never {
      return glob as any;
    },
    meta<Name extends keyof Config>(
      _name: Name,
      glob: Record<string, () => Promise<unknown>>,
    ): Config[Name] extends
      | MetaCollection<infer Schema>
      | DocsCollection<any, infer Schema>
      ? Promise<
          Record<string, () => Promise<StandardSchemaV1.InferOutput<Schema>>>
        >
      : never {
      return glob as any;
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
