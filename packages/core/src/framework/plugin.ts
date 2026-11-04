import type { ReactNode } from 'react';
import type { TranslationExtension } from '@/i18n';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { LoaderConfig, LoaderOptions, LoaderOutput, LoaderPluginOption, Page } from '@/source';
import type { TOCItemType } from '@/toc';

type Awaitable<T> = T | Promise<T>;

/**
 * - `static`: always prefer static, including search etc.
 * - `dynamic`: always prefer dynamic.
 * - `default`: only certain parts like search routes are dynamic.
 */
export type BuildMode = 'static' | 'dynamic' | 'default';

/** the site, `this` in plugin hooks; frameworks extend it */
export interface PluginContext<out Config extends LoaderConfig = LoaderConfig> {
  mode: BuildMode;
  /** prefix `pathname` with the base path of the site, a route of `path` is served at `withBase(path)` in every trailing slash setting */
  withBase(pathname: string): string;
  /** the content loader, from `configure()` of frameworks on */
  getLoader(): Awaitable<LoaderOutput<Config>>;
}

/** options of the content loader, `plugins` as an array to add to */
export interface PluginLoaderOptions extends Omit<LoaderOptions, 'plugins'> {
  plugins?: LoaderPluginOption[];
}

/**
 * A plugin of a framework: the routes, head tags and content hooks of an integration like OpenAPI, written once for every framework.
 *
 * Hooks run with the site as `this`, in the order of the framework, and combine in one of four ways:
 *
 * - setup (`init`, `configure`, `build`): run in order.
 * - contribute (`configureLoader`, `transformPage`): each plugin receives the options of the site or the base data of the page, frameworks merge the fields each result changes.
 * - resolve (`getPage*`): the first plugin returning a value other than `undefined` wins.
 * - collect (`head`, `routes`): the results of every plugin, in order.
 *
 * `middleware` runs as a chain. Frameworks run every hook, with their site as `Context` and their page data as `Data`, and may extend the contract with their own.
 *
 * Hooks are properties, so their `this` and page are checked strictly: a plugin for any site fits every site, not the other way round.
 */
export interface Plugin<
  in Config extends LoaderConfig = LoaderConfig,
  in Context extends PluginContext<Config> = PluginContext<Config>,
  Data extends DocsPageData = DocsPageData,
> {
  name?: string;

  /** UI translations of the plugin */
  translations?: TranslationExtension;

  /** runs before the content loader is created */
  init?: (this: Context) => Awaitable<void>;

  /**
   * Contribute options to the content loader, given the options of the site.
   *
   * Frameworks collect the `plugins` of every result, other options have one writer.
   */
  configureLoader?: (
    this: Context,
    options: Readonly<PluginLoaderOptions>,
  ) => Awaitable<Partial<PluginLoaderOptions> | undefined>;

  /** runs after the content loader is created */
  configure?: (this: Context) => Awaitable<void>;

  /** runs once after the site is built, not on dev or production servers; throw to fail the build */
  build?: (this: Context, output: BuildOutput) => Awaitable<void>;

  /** the rendered content of a page, implemented by content sources */
  getPageBody?: (this: Context, page: Config['page']) => Awaitable<PageBody | undefined>;

  /** the Markdown of a page, for LLMs */
  getPageText?: (this: Context, page: Config['page']) => Awaitable<string | undefined>;

  getPageToc?: (this: Context, page: Config['page']) => Awaitable<TOCItemType[] | undefined>;

  /** the text of a page for search indexes */
  getPageStructuredData?: (
    this: Context,
    page: Config['page'],
  ) => Awaitable<StructuredData | undefined>;

  getPageCreatedAt?: (this: Context, page: Config['page']) => Awaitable<Date | undefined>;

  getPageLastModified?: (this: Context, page: Config['page']) => Awaitable<Date | undefined>;

  transformPage?: (this: Context, data: Data, page: Config['page']) => Awaitable<Data>;

  /** tags in `<head>`, of every page without `page`, of a content page with it */
  head?: (this: Context, env: { page?: Config['page'] }) => Awaitable<HeadTag[] | undefined>;

  routes?: (this: Context) => Awaitable<ApiRoute[] | undefined>;

  /**
   * Runs for requests served on demand, prerendered routes skip it.
   *
   * Call `next()` to continue, or `next(path)` to serve another path instead, without the base path like the paths of routes.
   */
  middleware?: (
    this: Context,
    request: Request,
    next: (rewrite?: string) => Promise<Response>,
  ) => Promise<Response>;
}

/** the build output, given by the framework */
export interface BuildOutput {
  /** write a file to the output directory, `path` is relative to it, without the base path */
  emitFile: (path: string, content: string | Uint8Array) => Promise<void>;
}

/** a tag in `<head>`, rendered in order */
export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script' | 'style';
  /** HTML attributes, like `hreflang` */
  attrs?: Record<string, string>;
  /** text content, for `title`, `script` and `style` */
  children?: string;
}

/** the rendered content of a page */
export interface PageBody {
  /** React content: client components (`'use client'`) hydrate, others render on the server. */
  node: ReactNode;
}

/** the data of a docs page, transformed by plugins; frameworks extend it */
export interface DocsPageData extends Pick<Page, 'url' | 'path' | 'locale'> {
  title: string;
  description?: string;
  toc: TOCItemType[];
  /** use the full width of the page */
  full?: boolean;
  lastModified?: Date;
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
