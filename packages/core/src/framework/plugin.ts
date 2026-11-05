import type { ReactNode } from 'react';
import type { TranslationExtension } from '@/i18n';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { LoaderConfig, LoaderOptions, LoaderOutput, LoaderPluginOption } from '@/source';
import type { TOCItemType } from '@/toc';

type Awaitable<T> = T | Promise<T>;

/** the site, `this` in plugin hooks; frameworks extend it */
export interface PluginContext<out Config extends LoaderConfig = LoaderConfig> {
  /** prefix `pathname` with the base path of the site, a route of `path` is served at `withBase(path)` */
  withBase(pathname: string): string;
  /** the content loader, created from the results of `configureLoader` */
  getLoader(): Awaitable<LoaderOutput<Config>>;
}

/** options of the content loader, with `plugins` as an array */
export interface PluginLoaderOptions extends Omit<LoaderOptions, 'plugins'> {
  plugins?: LoaderPluginOption[];
}

/** what plugins create in `routes`; frameworks extend it */
export interface RouteFns {
  createApi(route: ApiRoute): void;
}

/**
 * A plugin of a framework: the routes and content hooks of an integration like OpenAPI, written once for every framework.
 *
 * Hooks run with the site as `this`, in the order of the framework, and combine in one of three ways:
 *
 * - contribute (`configureLoader`): each plugin receives the options of the site, frameworks merge the fields each result changes.
 * - resolve (`getPage*`): the first plugin returning a value other than `undefined` wins.
 * - collect (`routes`): what every plugin creates, in order.
 *
 * Frameworks run every hook, with their site as `Context`, and may extend the contract with their own.
 *
 * Hooks are properties, so their `this` and page are checked strictly: a plugin for any site fits every site, not the other way round.
 */
export interface Plugin<
  in Config extends LoaderConfig = LoaderConfig,
  in Context extends PluginContext<Config> = PluginContext<Config>,
  in Routes extends RouteFns = RouteFns,
> {
  name?: string;

  /** UI translations of the plugin */
  translations?: TranslationExtension;

  /**
   * Contribute options to the content loader, given the options of the site.
   *
   * Frameworks collect the `plugins` of every result, other options have one writer.
   */
  configureLoader?: (
    this: Context,
    options: Readonly<PluginLoaderOptions>,
  ) => Awaitable<Partial<PluginLoaderOptions> | undefined>;

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

  /** create the routes of the plugin */
  routes?: (this: Context, fns: Routes) => Awaitable<void>;
}

/** the rendered content of a page */
export interface PageBody {
  node: ReactNode;
}

export type Method = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/** a web-standard handler */
export type RouteHandler = (request: Request) => Awaitable<Response>;

/** a route handled on the server, its handlers are named by method, `ALL` handles every method */
export interface ApiRoute extends Partial<Record<Method | 'ALL', RouteHandler>> {
  /** the pathname without the base path, like `/api/proxy` */
  path: string;
}
