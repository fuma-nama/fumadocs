import { AsyncLocalStorage } from 'node:async_hooks';
import type { APIContext, MiddlewareNext } from 'astro';
import type { FC, ReactNode } from 'react';
import config from 'virtual:fumadocs/app';
import { onDemand, server } from 'virtual:fumadocs/config';
import { components } from 'virtual:fumadocs/components';
import { defineI18n, type TranslationExtension, type TranslationsAPI } from 'fumadocs-core/i18n';
import type * as PageTree from 'fumadocs-core/page-tree';
import { createGetUrl, type LoaderOutput, type Page } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { i18nProvider } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { SearchDialog, useSearch } from 'virtual:fumadocs/layout';
import type { ProviderData } from './ui/provider';
import { NoProcessedMarkdownError, trimSlash } from './shared';
import { toPageBody } from './island-node';
import { llmsPlugin } from './plugins/llms.txt';
import { oramaSearchPlugin } from './plugins/orama-search';
import { contentSourcePlugin } from './plugins/content-source';
import DocsPage from './ui/DocsPage.astro';

/** an Astro component, rendered on the server */
export interface AstroComponent {
  (...args: never[]): unknown;
  isAstroComponentFactory?: boolean;
}

export type AnyPage = Page<string | undefined, object>;

export interface PageRoute {
  type: 'page';
  /** the URL, including `base` */
  url: string;
  component: AstroComponent;
  props?: Record<string, unknown>;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type RouteHandler = (context: APIContext) => Response | Promise<Response>;

export interface FileRoute extends Partial<Record<Method, RouteHandler>> {
  type: 'file';
  url: string;
  /**
   * Generate the response at build time, only `GET` is used. Set it to `false` to handle requests on the server, which requires an adapter (see `app.server`).
   *
   * @defaultValue true
   */
  prerender?: boolean;
}

export type Route = PageRoute | FileRoute;

/** the body of a docs page */
export interface PageBody {
  /** receives `provider`, pass it to the `ContentProvider` of islands */
  component: AstroComponent;
  props?: Record<string, unknown>;
  toc?: TOCItemType[];
}

/** the body of a docs page as React content, like a page of a CMS rendered with `app.components` */
export interface NodeBody {
  node: ReactNode;
  toc?: TOCItemType[];
}

/** the data of a docs page, transformed by plugins */
export interface DocsPageData {
  title: string;
  description?: string;
  url: string;
  path: string;
  locale?: string;
  /** the key of its source in `multiple()` */
  type?: string;
  toc: TOCItemType[];
  full?: boolean;
  markdownUrl?: string;
  /** OG image */
  image?: string;
  /** the URL to view the source file */
  githubUrl?: string;
  lastModified?: Date;
}

/** the props of the component in the `page` module */
export interface DocsPageProps {
  tree: PageTree.Root;
  page: DocsPageData;
  /** `baseOptions()` of the `layout` module, over the defaults */
  layout: BaseLayoutProps;
  /** the body of page */
  children?: ReactNode;
}

export interface Plugin {
  name: string;
  /** translations used by the UI of plugin */
  translations?: TranslationExtension;
  routes?: (this: App) => Route[] | Promise<Route[]>;
  /**
   * Render the body of pages from a content source, return `undefined` to pass.
   *
   * A React `node` renders on the content island: components of `this.components` hydrate, others render on the server.
   */
  getBody?: (
    this: App,
    page: AnyPage,
  ) => PageBody | NodeBody | undefined | Promise<PageBody | NodeBody | undefined>;
  /** the Markdown of page, for LLMs */
  getText?: (this: App, page: AnyPage) => string | undefined | Promise<string | undefined>;
  transformPage?: (
    this: App,
    page: AnyPage,
    data: DocsPageData,
  ) => DocsPageData | Promise<DocsPageData>;
  /** an Astro middleware, it runs for every route, prerendered ones at build time (see `context.isPrerendered`) */
  middleware?: (
    this: App,
    context: APIContext,
    next: MiddlewareNext,
  ) => Response | Promise<Response> | undefined | Promise<undefined>;
}

export type PluginOption = Plugin | false | null | undefined | PluginOption[];

// oxlint-disable-next-line typescript/no-explicit-any -- `resolveHref` makes typed loaders unassignable to `LoaderOutput`
export interface FumadocsConfig<Source extends LoaderOutput<any> = LoaderOutput> {
  /** the source of pages, created with `loader()` */
  source: Source;

  /** the site name */
  title?: string;

  /** UI translations, defaults to the `i18n` of `source` */
  // oxlint-disable-next-line typescript/no-explicit-any -- languages are a union
  translations?: TranslationsAPI<any>;

  /** Astro component rendered in `<head>`, it receives `page` on docs pages */
  head?: AstroComponent;

  /** routes and features of the site, like `takumiPlugin()` */
  plugins?: PluginOption[];

  /**
   * Add the default plugins: search and LLMs, plugins of the same name replace them.
   *
   * The search index is left out when the `layout` module exports `useSearch` or `SearchDialog`.
   *
   * @defaultValue true
   */
  preset?: boolean;
}

/** the runtime of Fumadocs, `this` in plugin hooks */
export interface App {
  config: FumadocsConfig;
  source: LoaderOutput;
  plugins: Plugin[];
  /** the MDX components of the `components` option, React content rendered with them hydrates */
  // oxlint-disable-next-line typescript/no-explicit-any -- each component has its props, like `MDXComponents`
  components: Record<string, FC<any>>;
  /** `base` of Astro, without trailing slash */
  base: string;
  /** routes can render on request, with an adapter of Astro */
  server: boolean;
  /** remove `base`, for route params */
  toPath: (url: string) => string;
  /** pages of every language */
  getPages: () => AnyPage[];
  getBody: (page: AnyPage) => Promise<PageBody>;
  getText: (page: AnyPage) => Promise<string>;
  /** with the table of contents of `body` */
  getPageData: (page: AnyPage, body?: PageBody) => Promise<DocsPageData>;
  /** the routes of docs pages and plugins */
  getRoutes: () => Promise<Route[]>;
}

function flatten(plugins: PluginOption[], out: Plugin[] = []): Plugin[] {
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) flatten(plugin, out);
    else if (plugin) out.push(plugin);
  }
  return out;
}

function resolvePlugins(): Plugin[] {
  const plugins = flatten(config.plugins ?? []);
  if (config.preset !== false) {
    // content sources render their pages with no setup
    const preset = [llmsPlugin(), contentSourcePlugin()];
    // the built-in index serves the built-in search engine and dialog only
    if (!useSearch && !SearchDialog) preset.push(oramaSearchPlugin());
    for (const plugin of preset) {
      if (!plugins.some((item) => item.name === plugin.name)) plugins.push(plugin);
    }
  }
  return plugins;
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const app: App = {
  config,
  source: config.source,
  plugins: resolvePlugins(),
  components,
  base,
  server,
  toPath(url) {
    return url.startsWith(`${base}/`) || url === base ? url.slice(base.length) : url;
  },
  getPages() {
    if (!this.source._i18n) return this.source.getPages();
    const pages: AnyPage[] = [];
    for (const entry of this.source.getLanguages()) pages.push(...entry.pages);
    return pages;
  },
  async getBody(page) {
    for (const plugin of this.plugins) {
      const body = await plugin.getBody?.call(this, page);
      if (body) return 'node' in body ? toPageBody(body) : body;
    }
    const body = await collectionBody(page);
    if (body) return body;
    throw new Error(
      `No plugin renders the page "${page.path}", add the plugin of its content source.`,
    );
  },
  async getText(page) {
    for (const plugin of this.plugins) {
      const text = await plugin.getText?.call(this, page);
      if (text !== undefined) return text;
    }
    const data = page.data as { getText?: (type: 'raw' | 'processed') => Promise<string> };
    if (!data.getText) return (page.data as { description?: string }).description ?? '';
    try {
      return await data.getText('processed');
    } catch (error) {
      if (error instanceof NoProcessedMarkdownError) return data.getText('raw');
      throw error;
    }
  },
  getRoutes() {
    return getRoutes();
  },
  async getPageData(page, body) {
    const {
      title = page.slugs.at(-1) ?? '',
      description,
      type,
      full,
      lastModified,
    } = page.data as {
      title?: string;
      description?: string;
      type?: string;
      full?: boolean;
      lastModified?: unknown;
    };
    let data: DocsPageData = {
      title,
      description,
      url: page.url,
      path: page.path,
      locale: page.locale,
      type,
      toc: body?.toc ?? [],
      full,
      // from content sources, like the last edit of a CMS
      lastModified: toDate(lastModified),
    };
    for (const plugin of this.plugins) {
      if (plugin.transformPage) data = await plugin.transformPage.call(this, page, data);
    }
    return data;
  },
};

/** pages loaded by `toFumadocsSource()`, with the MDX content as an Astro component */
async function collectionBody(page: AnyPage): Promise<PageBody | undefined> {
  const data = page.data as { load?: () => Promise<{ body?: unknown; toc?: PageBody['toc'] }> };
  if (typeof data.load !== 'function') return;
  const { body, toc } = await data.load();
  if (
    typeof body === 'function' &&
    (body as { isAstroComponentFactory?: boolean }).isAstroComponentFactory
  )
    return { component: body as PageBody['component'], toc };
}

/** the UI translations of a language */
let translations: FumadocsConfig['translations'] | null;

/** the same for every page, created once */
function getTranslations() {
  if (translations !== undefined) return translations ?? undefined;
  const i18n = app.source._i18n;
  translations = config.translations ?? (i18n ? defineI18n(i18n).translations() : null);
  if (!translations) return;
  for (const plugin of app.plugins) {
    if (plugin.translations) translations.extend(plugin.translations);
  }
  return translations;
}

/** the props of providers, for an Astro component rendering islands */
export function getProviderData(
  astro: { url: URL; params: Record<string, string | undefined>; currentLocale?: string },
  lang = astro.currentLocale ?? localeOf(astro.url.pathname),
): ProviderData {
  const translations = getTranslations();
  return {
    pathname: astro.url.pathname,
    params: astro.params,
    i18n: translations && i18nProvider(translations, lang),
    search: app.plugins.some((plugin) => plugin.name === 'search'),
  };
}

/** a valid date, island props can't serialize an invalid one */
function toDate(value: unknown): Date | undefined {
  if (!(value instanceof Date) && typeof value !== 'string') return;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
}

/** the language of a URL, by its prefix like the URLs of pages */
function localeOf(pathname: string): string | undefined {
  const i18n = app.source._i18n;
  if (!i18n) return;
  const prefix = app.toPath(pathname).split('/')[1];
  return prefix && i18n.languages.includes(prefix) ? prefix : i18n.defaultLanguage;
}

/** the request being rendered, from the middleware of Fumadocs */
export const requests = new AsyncLocalStorage<APIContext>();

/** the props of content islands, `provider` defaults to the request, like content rendered on your pages */
export function getIslandProps({
  components: _components,
  children: _children,
  ...props
}: Record<string, unknown>): Record<string, unknown> {
  const context = props.provider ? undefined : requests.getStore();
  return context ? { ...props, provider: getProviderData(context) } : props;
}

/** the defaults of layout options, `baseOptions()` of the `layout` module goes over them */
export function getLayoutDefaults(lang?: string): BaseLayoutProps {
  const i18n = app.source._i18n;
  return {
    nav: { title: config.title, url: base + createGetUrl('/', i18n)([], i18n && lang) },
  };
}

let routes: Promise<Route[]> | undefined;

export function getRoutes(): Promise<Route[]> {
  return (routes ??= (async () => {
    const out: Route[] = [];
    for (const page of app.getPages())
      out.push({ type: 'page', url: page.url, component: DocsPage, props: { page } });

    for (const plugin of app.plugins) {
      if (!plugin.routes) continue;
      for (const route of await plugin.routes.call(app)) {
        if (route.type === 'file' && route.prerender === false && !app.server)
          throw new Error(
            `The route "${route.url}" of plugin "${plugin.name}" renders on request, add an adapter to Astro.`,
          );
        out.push(route);
      }
    }
    return out;
  })());
}

/** the static paths of routes, for a catch-all route of `param` */
export async function getStaticPaths<T extends Route['type']>(type: T, param: string) {
  const paths = [];
  for (const route of await getRoutes()) {
    if (route.type !== type) continue;
    if (route.type === 'file' && (route.prerender === false || !route.GET)) continue;
    const path = app.toPath(route.url).split('/').filter(Boolean).join('/');
    paths.push({
      // page URLs are encoded, like spaces in file names
      params: { [param]: decodeURI(path) || undefined },
      props: { route: route as Extract<Route, { type: T }> },
    });
  }
  return paths;
}

const methods: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

let serverRoutes: Promise<Map<string, Route>> | undefined;

/** the route rendered on request at the URL: file routes with `prerender: false`, and pages with `output: 'server'` */
export async function findServerRoute(pathname: string): Promise<Route | undefined> {
  serverRoutes ??= getRoutes().then((list) => {
    const map = new Map<string, Route>();
    for (const route of list) {
      if (route.type === 'file' ? route.prerender === false : onDemand)
        map.set(trimSlash(route.url), route);
    }
    return map;
  });
  return (await serverRoutes).get(trimSlash(decodeURI(pathname)));
}

/** the response of a file route to the request, by its method */
export function handleFileRoute(
  route: FileRoute,
  context: APIContext,
): Response | Promise<Response> {
  const { method } = context.request;
  const handler = route[method === 'HEAD' ? 'GET' : (method as Method)];
  if (handler) return handler(context);
  const allow: Method[] = [];
  for (const item of methods) if (route[item]) allow.push(item);
  return new Response(null, { status: 405, headers: { Allow: allow.join(', ') } });
}
