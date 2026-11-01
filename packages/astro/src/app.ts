import type { APIContext } from 'astro';
import type { ReactNode } from 'react';
import config from 'virtual:fumadocs/app';
import { defineI18n, type TranslationExtension, type TranslationsAPI } from 'fumadocs-core/i18n';
import type * as PageTree from 'fumadocs-core/page-tree';
import { createGetUrl, type LoaderOutput, type Page } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { i18nProvider } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { SearchDialog, useSearch } from 'virtual:fumadocs/layout';
import type { ProviderData } from './ui/provider';
import { llmsPlugin } from './plugins/llms.txt';
import { oramaSearchPlugin } from './plugins/orama-search';
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

export interface FileRoute {
  type: 'file';
  url: string;
  GET: (context: APIContext) => Response | Promise<Response>;
}

export type Route = PageRoute | FileRoute;

/** the body of a docs page */
export interface PageBody {
  /** receives `provider`, pass it to the `ContentProvider` of islands */
  component: AstroComponent;
  props?: Record<string, unknown>;
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
  /** render the body of pages from a content source, return `undefined` to pass */
  getBody?: (this: App, page: AnyPage) => PageBody | undefined | Promise<PageBody | undefined>;
  /** the Markdown of page, for LLMs */
  getText?: (this: App, page: AnyPage) => string | undefined | Promise<string | undefined>;
  transformPage?: (this: App, page: AnyPage, data: DocsPageData) => DocsPageData;
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
  /** `base` of Astro, without trailing slash */
  base: string;
  /** remove `base`, for route params */
  toPath: (url: string) => string;
  /** pages of every language */
  getPages: () => AnyPage[];
  getBody: (page: AnyPage) => Promise<PageBody>;
  getText: (page: AnyPage) => Promise<string>;
  /** with the table of contents of `body` */
  getPageData: (page: AnyPage, body?: PageBody) => Promise<DocsPageData>;
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
    const preset = [llmsPlugin()];
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
  base,
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
      if (body) return body;
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
    if (data.getText) return data.getText('processed').catch(() => data.getText!('raw'));
    return (page.data as { description?: string }).description ?? '';
  },
  async getPageData(page, body) {
    const {
      title = page.slugs.at(-1) ?? '',
      description,
      type,
      full,
    } = page.data as { title?: string; description?: string; type?: string; full?: boolean };
    let data: DocsPageData = {
      title,
      description,
      url: page.url,
      path: page.path,
      locale: page.locale,
      type,
      toc: body?.toc ?? [],
      full,
    };
    for (const plugin of this.plugins) {
      if (plugin.transformPage) data = plugin.transformPage.call(this, page, data);
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
export function getTranslations() {
  const i18n = app.source._i18n;
  const translations = config.translations ?? (i18n && defineI18n(i18n).translations());
  if (!translations) return;
  for (const plugin of app.plugins) {
    if (plugin.translations) translations.extend(plugin.translations);
  }
  return translations;
}

/** the props of providers, for an Astro component rendering islands */
export function getProviderData(
  astro: { url: URL; params: Record<string, string | undefined>; currentLocale?: string },
  lang = astro.currentLocale ?? app.source._i18n?.defaultLanguage,
): ProviderData {
  const translations = getTranslations();
  return {
    pathname: astro.url.pathname,
    params: astro.params,
    i18n: translations && i18nProvider(translations, lang),
    search: app.plugins.some((plugin) => plugin.name === 'search'),
  };
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
      if (plugin.routes) out.push(...(await plugin.routes.call(app)));
    }
    return out;
  })());
}

/** the static paths of routes, for a catch-all route of `param` */
export async function getStaticPaths<T extends Route['type']>(type: T, param: string) {
  const paths = [];
  for (const route of await getRoutes()) {
    if (route.type !== type) continue;
    const path = app.toPath(route.url).split('/').filter(Boolean).join('/');
    paths.push({
      params: { [param]: path || undefined },
      props: { route: route as Extract<Route, { type: T }> },
    });
  }
  return paths;
}
