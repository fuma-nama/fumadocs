import type { ComponentType, ReactNode } from 'react';
import type { TranslationExtension } from 'fumadocs-core/i18n';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { Meta, Page } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Context, PressLoaderOptions } from './context';

export type Awaitable<T> = T | Promise<T>;

/** the types of a site, inferred from its config */
export interface AppShape {
  page: Page;
  meta: Meta;
  lang: string | undefined;
  /** source names in multi-source setup */
  source: string | undefined;
}

/** features only one plugin can provide, the preset fills the ones no plugin provides */
export type Capability = 'search' | 'og-image' | (string & {});

/**
 * A plugin of Fumapress. Every hook runs with the site's {@link Context} as `this`, in plugin order (see `enforce`).
 *
 * Hooks combine in one of four ways:
 *
 * - setup (`init`, `configure`, `build`): run in order.
 * - resolve (`getPage*`): the first plugin returning a value other than `undefined` wins.
 * - transform (`configureLoader`, `transformPage`): each plugin receives the result of the previous one.
 * - collect (`head`, `slots`, `routes`): the results of every plugin are concatenated.
 *
 * Create plugins with generic functions, like `myPlugin<C extends AppShape = AppShape>(): Plugin<C>`: the context is typed by the site, a `Plugin` of the default shape doesn't fit typed sites.
 */
export interface Plugin<in C extends AppShape = AppShape> {
  /** a plugin replaces the preset plugin of the same name */
  name?: string;

  /** run before (`pre`) or after (`post`) the other plugins */
  enforce?: 'pre' | 'post';

  /** only one plugin can provide each capability */
  provides?: readonly Capability[];

  /** an API for other plugins, from `this.getPlugin(name)?.api` */
  api?: unknown;

  /** UI translations of the plugin */
  translations?: TranslationExtension;

  /** runs before the content loader is created */
  init?(this: Context<C>): Awaitable<void>;

  /** options of the content loader, like loader plugins */
  configureLoader?(this: Context<C>, options: PressLoaderOptions): Awaitable<PressLoaderOptions>;

  /** runs after the content loader is created */
  configure?(this: Context<C>): Awaitable<void>;

  /** runs once after the site is built, not on dev or production servers; throw to fail the build */
  build?(this: Context<C>, output: BuildOutput): Awaitable<void>;

  /** the rendered content of a page, implemented by content sources */
  getPageBody?(this: Context<C>, page: C['page']): Awaitable<PageBody | undefined>;

  /** the Markdown of a page, for LLMs */
  getPageText?(this: Context<C>, page: C['page']): Awaitable<string | undefined>;

  getPageToc?(this: Context<C>, page: C['page']): Awaitable<TOCItemType[] | undefined>;

  /** the text of a page for search indexes */
  getPageStructuredData?(this: Context<C>, page: C['page']): Awaitable<StructuredData | undefined>;

  getPageCreatedAt?(this: Context<C>, page: C['page']): Awaitable<Date | undefined>;

  getPageLastModified?(this: Context<C>, page: C['page']): Awaitable<Date | undefined>;

  /** the data of a docs page, like `full` or `markdownUrl` */
  transformPage?(this: Context<C>, data: DocsPageData, page: C['page']): Awaitable<DocsPageData>;

  /** tags in `<head>`, of every page without `page`, of a content page with it */
  head?(this: Context<C>, env: { page?: C['page'] }): Awaitable<HeadTag[] | undefined>;

  /** UI in the slots of a content page */
  slots?(this: Context<C>, env: { page: C['page'] }): Awaitable<SlotItem[] | undefined>;

  routes?(this: Context<C>): Awaitable<ApiRoute[] | undefined>;

  /**
   * Runs for requests served on demand, prerendered routes skip it.
   *
   * Call `next()` to continue, or `next(path)` to serve another path instead, without the base path like the paths of routes.
   */
  middleware?(
    this: Context<C>,
    request: Request,
    next: (rewrite?: string) => Promise<Response>,
  ): Promise<Response>;
}

/** the build output, given by the framework */
export interface BuildOutput {
  /** write a file to the output directory, `path` is relative to it, without the base path */
  emitFile: (path: string, content: string | Uint8Array) => Promise<void>;
}

export type PluginOption<C extends AppShape = AppShape> =
  | Plugin<C>
  | false
  | undefined
  | null
  | PluginOption<C>[];

const enforceOrder: Record<NonNullable<Plugin['enforce']>, number> = { pre: -1, post: 1 };

function flatten<C extends AppShape>(
  plugins: PluginOption<C>[],
  out: Plugin<C>[] = [],
): Plugin<C>[] {
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) flatten(plugin, out);
    else if (plugin) out.push(plugin);
  }
  return out;
}

/** `plugins` with the ones of `preset` they don't replace by name or capability, sorted by `enforce` */
export function resolvePlugins<C extends AppShape>(
  plugins: PluginOption<C>[],
  preset: PluginOption<C>[],
): Plugin<C>[] {
  const out = flatten(plugins);
  const names = new Set<string>();
  const capabilities = new Set<Capability>();
  for (const plugin of out) {
    if (plugin.name) names.add(plugin.name);
    for (const capability of plugin.provides ?? []) capabilities.add(capability);
  }

  for (const plugin of flatten(preset)) {
    if (plugin.name && names.has(plugin.name)) continue;
    if (plugin.provides?.some((capability) => capabilities.has(capability))) continue;
    out.push(plugin);
  }

  const providers = new Map<Capability, Plugin<C>>();
  for (const plugin of out) {
    for (const capability of plugin.provides ?? []) {
      const other = providers.get(capability);
      if (other)
        throw new Error(
          `[Fumapress] "${other.name ?? 'unnamed'}" and "${plugin.name ?? 'unnamed'}" both provide "${capability}", only one plugin can provide it.`,
        );
      providers.set(capability, plugin);
    }
  }

  return out.sort(
    (a, b) => (a.enforce ? enforceOrder[a.enforce] : 0) - (b.enforce ? enforceOrder[b.enforce] : 0),
  );
}

/** the rendered content of a page */
export interface PageBody {
  /**
   * React content. Client components hydrate: through `'use client'` on React Server Components, and when
   * registered as MDX components on Astro, others render on the server.
   */
  node: ReactNode;
}

/** the data of a docs page, transformed by plugins */
export interface DocsPageData extends Pick<Page, 'url' | 'path' | 'locale'> {
  title: string;
  description?: string;
  toc: TOCItemType[];
  /** use the full width of the page */
  full?: boolean;
  /** the URL of its Markdown, for LLMs */
  markdownUrl?: string;
  /** the URL of its OG image */
  image?: string;
  /** the URL to view its source file */
  githubUrl?: string;
  lastModified?: Date;
}

/** a tag in `<head>`, rendered in order */
export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script' | 'style';
  /** HTML attributes, like `hreflang` */
  attrs?: Record<string, string>;
  /** text content, for `title`, `script` and `style` */
  children?: string;
}

/**
 * Places for UI on a content page, every layout renders them:
 *
 * - `page.actions`: beside the page actions, like copying the Markdown.
 * - `page.footer`: after the content.
 * - `body.wrapper`: around the content, the component receives it as `children`.
 */
export type SlotName = 'page.actions' | 'page.footer' | 'body.wrapper';

export interface SlotItem {
  slot: SlotName;
  // oxlint-disable-next-line typescript/no-explicit-any -- props are checked by `props`
  component: ComponentType<any>;
  /** serializable on Astro, where client components hydrate as islands */
  props?: Record<string, unknown>;
  /** lower comes first, defaults to `0` */
  order?: number;
}

export const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;

export type Method = (typeof methods)[number];

/** `[name]` params are strings, `[...name]` params are arrays of segments */
export type RouteParams = Record<string, string | string[]>;

/** a web-standard handler, return a 404 response for paths without content */
export type RouteHandler = (
  request: Request,
  context: { params: RouteParams },
) => Awaitable<Response>;

/** an API route, its handlers are named by method, `ALL` handles every method */
export interface ApiRoute extends Partial<Record<Method | 'ALL', RouteHandler>> {
  /**
   * URL pattern without the base path, like `/llms.txt` or `/api/[...slugs]`.
   *
   * Params are written as `[name]`, and `[...name]` for the rest of the path.
   */
  path: string;

  /**
   * - `static`: generate the `GET` response at build time.
   * - `dynamic`: handle requests on the server.
   *
   * @defaultValue `static` in `default` and `static` mode, `dynamic` in `dynamic` mode
   */
  render?: 'static' | 'dynamic';

  /** the params of each static page, in the order of the path, required when the path has params */
  staticPaths?: string[] | string[][];
}
