import type {
  APIContext,
  APIRoute,
  GetStaticPathsItem,
  MiddlewareHandler,
  MiddlewareNext,
} from 'astro';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import config from 'virtual:fumadocs/app';
import { onDemand, server } from 'virtual:fumadocs/config';
import { components } from 'virtual:fumadocs/components';
import { defineI18n, type TranslationExtension, type TranslationsAPI } from 'fumadocs-core/i18n';
import type * as PageTree from 'fumadocs-core/page-tree';
import { createGetUrl, type LoaderOutput, type Page, type PageData } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { i18nProvider } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { SearchDialog, useSearch } from 'virtual:fumadocs/layout';
import type { ProviderData } from './ui/provider';
import { NoProcessedMarkdownError, type AstroPageData } from './source';
import { getBase, isPageDataOf, trimSlash } from './shared';
import { toPageBody } from './island-node';
import { llmsPlugin } from './plugins/llms.txt';
import { oramaSearchPlugin } from './plugins/orama-search';
import { contentSourcePlugin } from './plugins/content-source';
import DocsPage from './ui/DocsPage.astro';

type Awaitable<T> = T | Promise<T>;

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;

export type Method = (typeof methods)[number];

interface RouteBase {
  /** the URL, including `base` */
  url: string;
}

export interface PageRoute extends RouteBase {
  type: 'page';
  component: AstroComponentFactory;
  props?: Record<string, unknown>;
}

export interface FileRoute extends RouteBase, Partial<Record<Method, APIRoute>> {
  type: 'file';
  /**
   * Generate the response at build time, only `GET` is used. Set it to `false` to handle requests on the server, which requires an adapter (see `app.server`).
   *
   * @defaultValue true
   */
  prerender?: boolean;
}

export type Route = PageRoute | FileRoute;

interface BodyBase {
  toc?: TOCItemType[];
}

/** the body of a docs page as an Astro component, it receives `provider` with `props` */
export interface ComponentBody extends BodyBase {
  component: AstroComponentFactory;
  props?: Record<string, unknown>;
}

/** the body of a docs page as React content, like a page of a CMS rendered with `app.components` */
export interface NodeBody extends BodyBase {
  node: ReactNode;
}

export type PageBody = ComponentBody | NodeBody;

/** the data of a docs page, transformed by plugins */
export interface DocsPageData
  extends Pick<Page, 'url' | 'path' | 'locale' | 'type'>, Pick<PageData, 'description'> {
  title: string;
  toc: TOCItemType[];
  full?: boolean;
  /** the URL of its Markdown, for LLMs */
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
  routes?: (this: App) => Awaitable<Route[]>;
  /**
   * Render the body of pages from a content source, return `undefined` to pass.
   *
   * A React `node` renders on the content island: components of `this.components` hydrate, others render on the server.
   */
  getBody?: (this: App, page: Page) => Awaitable<PageBody | undefined>;
  /** the Markdown of page, for LLMs */
  getText?: (this: App, page: Page) => Awaitable<string | undefined>;
  transformPage?: (this: App, page: Page, data: DocsPageData) => Awaitable<DocsPageData>;
  /** an Astro middleware, it runs for every route, prerendered ones at build time (see `context.isPrerendered`) */
  middleware?: (
    this: App,
    context: APIContext,
    next: MiddlewareNext,
  ) => ReturnType<MiddlewareHandler>;
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
  head?: AstroComponentFactory;

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
  components: MDXComponents;
  /** `base` of Astro, without trailing slash */
  base: string;
  /** routes can render on request, with an adapter of Astro */
  server: boolean;
  /** remove `base`, for route params */
  toPath: (url: string) => string;
  /** pages of every language */
  getPages: () => Page[];
  /** React bodies are rendered into the content island */
  getBody: (page: Page) => Promise<ComponentBody>;
  getText: (page: Page) => Promise<string>;
  /** with the table of contents of `body` */
  getPageData: (page: Page, body?: BodyBase) => Promise<DocsPageData>;
  /** the routes of docs pages and plugins */
  getRoutes: () => Promise<Route[]>;
}

/** pages of `toFumadocsSource()` */
function isAstroPageData(data: PageData): data is AstroPageData {
  return isPageDataOf<AstroPageData>(data, 'getText');
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
  if (config.preset === false) return plugins;
  // content sources render their pages with no setup
  const preset = [llmsPlugin(), contentSourcePlugin()];
  // the built-in index serves the built-in search engine and dialog only
  if (!useSearch && !SearchDialog) preset.push(oramaSearchPlugin());
  for (const plugin of preset) {
    if (!plugins.some((item) => item.name === plugin.name)) plugins.push(plugin);
  }
  return plugins;
}

const base = getBase();

export const app: App = {
  config,
  source: config.source,
  plugins: resolvePlugins(),
  components,
  base,
  server,
  toPath(url) {
    return url === base || url.startsWith(`${base}/`) ? url.slice(base.length) : url;
  },
  getPages() {
    // with no language, the pages of every language
    return this.source.getPages();
  },
  async getBody(page) {
    for (const plugin of this.plugins) {
      const body = await plugin.getBody?.call(this, page);
      if (body) return 'node' in body ? toPageBody(body) : body;
    }
    if (isAstroPageData(page.data)) {
      const { body, toc } = await page.data.load();
      return { component: body, toc };
    }
    throw new Error(
      `No plugin renders the page "${page.path}", add the plugin of its content source.`,
    );
  },
  async getText(page) {
    for (const plugin of this.plugins) {
      const text = await plugin.getText?.call(this, page);
      if (text !== undefined) return text;
    }
    const { data } = page;
    if (!isAstroPageData(data)) return data.description ?? '';
    try {
      return await data.getText('processed');
    } catch (error) {
      if (error instanceof NoProcessedMarkdownError) return data.getText('raw');
      throw error;
    }
  },
  getRoutes,
  async getPageData(page, body) {
    const { data } = page;
    let out: DocsPageData = {
      title: data.title ?? page.slugs.at(-1) ?? '',
      description: data.description,
      url: page.url,
      path: page.path,
      locale: page.locale,
      type: page.type,
      toc: body?.toc ?? [],
      // from the frontmatter or content sources, like the last edit of a CMS
      full: 'full' in data && typeof data.full === 'boolean' ? data.full : undefined,
      lastModified: 'lastModified' in data ? toDate(data.lastModified) : undefined,
    };
    for (const plugin of this.plugins) {
      if (plugin.transformPage) out = await plugin.transformPage.call(this, page, out);
    }
    return out;
  },
};

/** a valid date, island props can't serialize an invalid one */
function toDate(value: unknown): Date | undefined {
  if (!(value instanceof Date) && typeof value !== 'string') return;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
}

const i18n = app.source._i18n;

/** the UI translations with the ones of plugins, the same for every page */
const translations = config.translations ?? (i18n && defineI18n(i18n).translations());
if (translations) {
  for (const plugin of app.plugins) {
    if (plugin.translations) translations.extend(plugin.translations);
  }
}

const hasSearch = app.plugins.some((plugin) => plugin.name === 'search');

/** the props of providers, for an Astro component rendering islands */
export function getProviderData(
  astro: { url: URL; params: APIContext['params']; currentLocale?: string },
  lang = astro.currentLocale ?? localeOf(astro.url.pathname),
): ProviderData {
  return {
    pathname: astro.url.pathname,
    params: astro.params,
    i18n: translations && i18nProvider(translations, lang),
    search: hasSearch,
  };
}

/** the language of a URL, by its prefix like the URLs of pages */
function localeOf(pathname: string): string | undefined {
  if (!i18n) return;
  const prefix = app.toPath(pathname).split('/')[1];
  return prefix && i18n.languages.includes(prefix) ? prefix : i18n.defaultLanguage;
}

const serializedTrees = new WeakMap<PageTree.Root, Promise<string>>();

/** JSON of the serialized page tree of a language, once per tree: island props are serialized again on each page */
export function getSerializedTree(locale?: string): Promise<string> {
  const tree = app.source.getPageTree(locale);
  let json = serializedTrees.get(tree);
  if (!json) {
    json = app.source.serializePageTree(tree).then((serialized) => JSON.stringify(serialized));
    serializedTrees.set(tree, json);
  }
  return json;
}

const getRootUrl = createGetUrl('/', i18n);

/** the defaults of layout options, `baseOptions()` of the `layout` module goes over them */
export function getLayoutDefaults(lang?: string): BaseLayoutProps {
  return { nav: { title: config.title, url: base + getRootUrl([], i18n && lang) } };
}

let routes: Promise<Route[]> | undefined;

/** the routes of docs pages and plugins, created once */
export function getRoutes(): Promise<Route[]> {
  return (routes ??= createRoutes());
}

async function createRoutes(): Promise<Route[]> {
  const out: Route[] = [];
  for (const page of app.getPages()) {
    out.push({ type: 'page', url: page.url, component: DocsPage, props: { page } });
  }
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
}

type RouteOf<Type extends Route['type']> = Extract<Route, { type: Type }>;

/** a static path of a catch-all route, its props hold the route */
type StaticPath<Type extends Route['type']> = GetStaticPathsItem & {
  props: { route: RouteOf<Type> };
};

function isRouteOf<Type extends Route['type']>(route: Route, type: Type): route is RouteOf<Type> {
  return route.type === type;
}

/** the static paths of prerendered routes, for a catch-all route of `param` */
export async function getStaticPaths<Type extends Route['type']>(
  type: Type,
  param: string,
): Promise<StaticPath<Type>[]> {
  const paths: StaticPath<Type>[] = [];
  for (const route of await getRoutes()) {
    if (route.type === 'file' && (route.prerender === false || !route.GET)) continue;
    if (!isRouteOf(route, type)) continue;
    const path = app.toPath(route.url).split('/').filter(Boolean).join('/');
    paths.push({
      // page URLs are encoded, like spaces in file names
      params: { [param]: decodeURI(path) || undefined },
      props: { route },
    });
  }
  return paths;
}

let serverRoutes: Promise<Map<string, Route>> | undefined;

/** the routes rendered on request by URL: file routes with `prerender: false`, and pages with `output: 'server'` */
async function createServerRoutes(): Promise<Map<string, Route>> {
  const map = new Map<string, Route>();
  for (const route of await getRoutes()) {
    if (route.type === 'file' ? route.prerender === false : onDemand)
      map.set(trimSlash(route.url), route);
  }
  return map;
}

/** the route rendered on request at the pathname, encoded like the URLs of routes */
export async function findServerRoute(pathname: string): Promise<Route | undefined> {
  return (await (serverRoutes ??= createServerRoutes())).get(trimSlash(pathname));
}

function isMethod(method: string): method is Method {
  return methods.some((item) => item === method);
}

/** the response of a file route to the request, by its method */
export function handleFileRoute(route: FileRoute, context: APIContext): ReturnType<APIRoute> {
  const { method } = context.request;
  const handler = method === 'HEAD' ? route.GET : isMethod(method) ? route[method] : undefined;
  if (handler) return handler(context);
  const allow: Method[] = [];
  for (const item of methods) if (route[item]) allow.push(item);
  return new Response(null, { status: 405, headers: { Allow: allow.join(', ') } });
}
