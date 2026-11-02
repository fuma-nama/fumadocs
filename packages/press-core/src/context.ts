import {
  defineI18n,
  type I18nConfig,
  type SingularTranslationsAPI,
  type TranslationsAPI,
} from 'fumadocs-core/i18n';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type {
  _Internal,
  ContentStorage,
  LoaderConfig,
  LoaderOptions,
  LoaderOutput,
  LoaderPluginOption,
  SourceUnion,
} from 'fumadocs-core/source';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import {
  methods,
  resolvePlugins,
  type ApiRoute,
  type AppShape,
  type Awaitable,
  type BuildOutput,
  type Capability,
  type DocsPageData,
  type HeadTag,
  type PageBody,
  type Plugin,
  type PluginOption,
  type SlotItem,
  type SlotName,
} from './plugin';
import { addRepoLink, getFileUrl, resolveGit, type GitProvider } from './git';

/**
 * - `static`: always prefer static, including search etc.
 * - `dynamic`: always prefer dynamic.
 * - `default`: only certain parts like search routes are dynamic.
 */
export type BuildMode = 'static' | 'dynamic' | 'default';

/** make plugins an array for easier modification */
export interface PressLoaderOptions<
  S extends ContentStorage = ContentStorage,
  I18n extends I18nConfig | undefined = I18nConfig | undefined,
> extends Omit<LoaderOptions<S, I18n>, 'plugins'> {
  plugins?: LoaderPluginOption[];
}

export type InferAppShape<
  I extends _Internal.AnyInput = _Internal.AnyInput,
  Lang extends string | undefined = string | undefined,
> = {
  page: _Internal.GeneratePage<I>;
  meta: _Internal.GenerateMeta<I>;
  lang: Lang;
  source: I extends Record<infer K, SourceUnion> ? K : undefined;
};

/** the i18n config of a site with the languages `Lang`, plugins for any site (`string | undefined`) get either */
type InferI18nConfig<Lang extends string | undefined> = [Lang] extends [undefined]
  ? undefined
  : [Lang] extends [string]
    ? I18nConfig<Lang>
    : I18nConfig | undefined;

export interface SiteConfig {
  /** full URL of the site with the base path, like `https://example.com/docs`, for metadata like canonical URLs */
  baseUrl?: string;

  /**
   * `hreflang` values by locale, for locale codes that are not BCP 47 language tags.
   *
   * @example { cn: "zh-Hans" }
   */
  hreflang?: Record<string, string>;

  name?: string;

  git?: {
    /** @defaultValue "github" */
    provider?: GitProvider;
    /** base URL of a self-hosted instance, like `https://gitlab.example.com` */
    url?: string;
    /** the user or organisation (group on GitLab) that owns the repo */
    user: string;
    repo: string;
    branch: string;
    /** the root directory of the repo */
    rootDir?: string;
  };
}

/** the config of a site, the same on every framework */
export interface PressConfig<
  I extends _Internal.AnyInput = _Internal.AnyInput,
  Lang extends string | undefined = string | undefined,
> {
  mode?: BuildMode;
  site?: SiteConfig;

  /**
   * - `recommended`: add the plugins of the framework, like sitemap, llms.txt and search. Plugins of the same name or capability in `plugins` replace them.
   * - `false`: no plugins are added.
   *
   * @defaultValue "recommended"
   */
  preset?: 'recommended' | false;

  /** the content sources */
  content: I;

  plugins?: PluginOption<InferAppShape<I, Lang>>[];

  /** i18n config, optional when `translations` is specified */
  i18n?: InferI18nConfig<Lang>;

  translations?:
    | ([Lang] extends [undefined] ? never : TranslationsAPI<NonNullable<Lang>, any>)
    | SingularTranslationsAPI<any>;

  loaderOptions?: Omit<
    PressLoaderOptions<_Internal.GenerateStorage<I>, InferI18nConfig<Lang>>,
    'baseUrl' | 'i18n'
  > & {
    /**
     * Revalidate the dynamic content sources on each request, otherwise call `revalidateLoader()`.
     *
     * @defaultValue false
     */
    alwaysRevalidate?: boolean;
  };

  /** props of every Fumadocs UI layout */
  defaultLayoutProps?:
    | Omit<BaseLayoutProps, 'children'>
    | ((
        this: Context<InferAppShape<I, Lang>>,
        env: { lang: string | undefined },
      ) => Awaitable<Omit<BaseLayoutProps, 'children'>>);

  /** head tags of every page, without `page`, and of content pages */
  head?: Plugin<InferAppShape<I, Lang>>['head'];
}

/** what a framework gives to {@link createPress} */
export interface PressRuntime<C extends AppShape = AppShape> {
  /** the base path of the site, `/` at the root */
  base: string;
  /** plugins of the `recommended` preset */
  preset?: () => Awaitable<PluginOption<C>[]>;
}

export interface PageAlternate {
  locale: string;
  /** from `site.hreflang`, defaults to the locale code */
  hreflang: string;
  href: string;
}

/** the site, `this` in plugin hooks */
export interface Context<out C extends AppShape = AppShape> {
  mode: BuildMode;
  /** the base path of the site, `/` at the root */
  base: string;
  /**
   * resolved and ordered, of any site: typed by the site, a context couldn't be passed to plugins written for every site
   */
  plugins: readonly Plugin[];
  getPlugin(name: string): Plugin | undefined;
  /** the plugin providing a capability */
  getProvider(capability: Capability): Plugin | undefined;

  siteConfig: {
    name: string;
    baseUrl?: string;
    hreflang?: Record<string, string>;
    git?: Required<Pick<NonNullable<SiteConfig['git']>, 'provider' | 'url' | 'rootDir'>> &
      NonNullable<SiteConfig['git']>;
  };
  i18nConfig?: InferI18nConfig<C['lang']>;
  /** extended with the translations of plugins */
  translationsConfig?: TranslationsAPI<NonNullable<C['lang']>> | SingularTranslationsAPI;

  getLoader(): Awaitable<
    LoaderOutput<{
      i18n: InferI18nConfig<C['lang']>;
      meta: C['meta'];
      page: C['page'];
      source: C['source'];
    }>
  >;
  /** revalidate dynamic content sources, all of them without `source` */
  revalidateLoader(source?: C['source']): Promise<void>;
  /** invalidate dynamic content sources, all of them without `source` */
  invalidateLoader(source?: C['source']): void;

  /** prefix `pathname` with the language segment, unless `i18n.hideLocale` hides it */
  localizePath(lang: string | undefined, pathname: string): string;
  /** prefix `pathname` with the base path */
  withBase(pathname: string): string;
  /** a full URL from `site.baseUrl`, or `withBase(pathname)` when unset; full URLs are kept */
  absoluteUrl(pathname: string): string;
  /** the URL of a file on the git provider, requires `site.git` */
  getFileUrl(absolutePath: string): string | undefined;
  /** translations of a page for `hreflang` links, without fallback pages, empty when it has none */
  getPageAlternates(page: C['page']): Promise<PageAlternate[]>;
  /** the page this one is shown in place of, when its language has no file of its own */
  getFallbackOrigin(page: C['page']): Promise<C['page'] | undefined>;

  getPageBody(page: C['page']): Promise<PageBody | undefined>;
  getPageText(page: C['page']): Promise<string | undefined>;
  getPageToc(page: C['page']): Promise<TOCItemType[] | undefined>;
  getPageStructuredData(page: C['page']): Promise<StructuredData | undefined>;
  getPageCreatedAt(page: C['page']): Promise<Date | undefined>;
  getPageLastModified(page: C['page']): Promise<Date | undefined>;

  /** the data of a docs page, from the page and `transformPage` of plugins */
  getPageData(page: C['page']): Promise<DocsPageData>;
  /** with the defaults (title, description, Open Graph, canonical, `hreflang`) for a content page */
  getHead(env: { page?: C['page'] }): Promise<HeadTag[]>;
  /** sorted by `order` */
  getSlots(page: C['page']): Promise<Partial<Record<SlotName, SlotItem[]>>>;
  /** with `render` filled in from `mode` */
  getRoutes(): Promise<ApiRoute[]>;
  /** runs the `middleware` of plugins */
  handleRequest(request: Request, next: (rewrite?: string) => Promise<Response>): Promise<Response>;
  /** runs the `build` of plugins, frameworks call it once after building the site */
  build(output: BuildOutput): Promise<void>;

  defaultLayoutProps(env: { lang: string | undefined }): Promise<Omit<BaseLayoutProps, 'children'>>;
}

/** join paths with `/`, the first one is kept as-is, like a base URL */
export function joinPaths(...paths: string[]): string {
  let out = paths[0] ?? '';
  for (let i = 1; i < paths.length; i++) {
    let p = paths[i];
    if (p.startsWith('/')) p = p.slice(1);
    if (p.endsWith('/')) p = p.slice(0, -1);
    // skip empty and `.` segments, like a relative base path of `./`
    if (p.length === 0 || p === '.') continue;

    out = out.endsWith('/') ? out + p : `${out}/${p}`;
  }
  return out;
}

/**
 * The page `page` is inherited from when its language has no file of its own, pages shared by every language (`$`) count too.
 *
 * Translations are told apart by their file path: the loader assigns a file to a language by its `.{locale}` suffix, so two languages share a `path` only when they share the file.
 */
function fallbackOrigin<Config extends LoaderConfig>(
  source: LoaderOutput<Config>,
  i18n: I18nConfig,
  page: Config['page'],
): Config['page'] | undefined {
  const lang = i18n.fallbackLanguage ?? i18n.defaultLanguage;
  if (page.locale === lang) return;
  const origin = source.getPage(page.slugs, lang);
  if (origin?.path === page.path) return origin;
}

/** the items of every result in order, for collect hooks */
async function collect<T>(results: Awaitable<T[] | undefined>[]): Promise<T[]> {
  const out: T[] = [];
  for (const items of await Promise.all(results)) if (items) out.push(...items);
  return out;
}

/** create the site, a framework calls it once and renders its routes and layouts from the context */
export function createPress<
  I extends _Internal.AnyInput,
  Lang extends string | undefined = undefined,
>(
  config: PressConfig<I, Lang>,
  runtime: PressRuntime<InferAppShape<I, Lang>>,
): Promise<Context<InferAppShape<I, Lang>>>;

export async function createPress(
  config: PressConfig,
  runtime: PressRuntime<InferAppShape>,
): Promise<Context<InferAppShape>> {
  const { site, translations = config.i18n && defineI18n(config.i18n).translations() } = config;
  const i18nConfig = translations && 'config' in translations ? translations.config : config.i18n;
  if (i18nConfig?.hideLocale === 'always')
    throw new Error(
      '[Fumapress] `hideLocale: "always"` is not supported, languages are told apart by their URL prefix. Use `hideLocale: "default-locale"` to drop the prefix of the default language only.',
    );

  const plugins = resolvePlugins(
    config.plugins ?? [],
    config.preset === false ? [] : ((await runtime.preset?.()) ?? []),
  );
  for (const plugin of plugins) {
    if (plugin.translations) translations?.extend(plugin.translations);
  }

  /** the first value of a resolve hook */
  async function resolve<T>(
    page: InferAppShape['page'],
    hook: (
      plugin: Plugin<InferAppShape>,
    ) =>
      | ((this: Context<InferAppShape>, page: InferAppShape['page']) => Awaitable<T | undefined>)
      | undefined,
  ): Promise<T | undefined> {
    for (const plugin of plugins) {
      const value = await hook(plugin)?.call(ctx, page);
      if (value !== undefined) return value;
    }
  }

  /** the head tags of a content page, fallback pages point at their origin and are not indexed */
  async function getPageHead(page: InferAppShape['page']): Promise<HeadTag[]> {
    const [{ title, description, image }, origin, alternates] = await Promise.all([
      ctx.getPageData(page),
      ctx.getFallbackOrigin(page),
      ctx.getPageAlternates(page),
    ]);
    const { name, baseUrl } = ctx.siteConfig;
    const tags: HeadTag[] = [
      { tag: 'title', children: title },
      { tag: 'meta', attrs: { property: 'og:title', content: title } },
      { tag: 'meta', attrs: { property: 'og:site_name', content: name } },
    ];
    if (description)
      tags.push(
        { tag: 'meta', attrs: { name: 'description', content: description } },
        { tag: 'meta', attrs: { property: 'og:description', content: description } },
      );
    if (image)
      tags.push(
        { tag: 'meta', attrs: { property: 'og:image', content: image } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
      );
    if (baseUrl) {
      const href = ctx.absoluteUrl((origin ?? page).url);
      tags.push(
        { tag: 'link', attrs: { rel: 'canonical', href } },
        { tag: 'meta', attrs: { property: 'og:url', content: href } },
      );
    }
    for (const { hreflang, href } of alternates)
      tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang, href } });
    const xDefault =
      alternates.find((item) => item.locale === ctx.i18nConfig?.defaultLanguage) ?? alternates[0];
    if (xDefault)
      tags.push({
        tag: 'link',
        attrs: { rel: 'alternate', hreflang: 'x-default', href: xDefault.href },
      });
    if (origin) tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } });
    return tags;
  }

  const ctx: Context<InferAppShape> = {
    mode: config.mode ?? 'default',
    base: runtime.base,
    plugins,
    getPlugin: (name) => plugins.find((plugin) => plugin.name === name),
    getProvider: (capability) => plugins.find((plugin) => plugin.provides?.includes(capability)),
    siteConfig: {
      ...site,
      name: site?.name ?? 'Fumapress',
      git: site?.git && resolveGit(site.git),
    },
    i18nConfig,
    translationsConfig: translations,
    getLoader() {
      throw new Error(
        '[Fumapress] the content loader is created after `configureLoader()`, use it from `configure()` on.',
      );
    },
    async revalidateLoader() {},
    invalidateLoader() {},
    localizePath(lang, pathname) {
      const i18n = ctx.i18nConfig;
      if (!i18n || !lang || (i18n.hideLocale === 'default-locale' && lang === i18n.defaultLanguage))
        return pathname;
      return joinPaths(`/${lang}`, pathname);
    },
    withBase: (pathname) => joinPaths('/', ctx.base, pathname),
    absoluteUrl(pathname) {
      if (URL.canParse(pathname)) return pathname;
      const { baseUrl } = ctx.siteConfig;
      // joined to keep the path of `baseUrl`
      return baseUrl ? new URL(joinPaths(baseUrl, pathname)).href : ctx.withBase(pathname);
    },
    getFileUrl: (absolutePath) =>
      ctx.siteConfig.git && getFileUrl(ctx.siteConfig.git, absolutePath),
    async getPageAlternates(page) {
      const i18n = ctx.i18nConfig;
      if (!i18n) return [];
      const source = await ctx.getLoader();
      const out: PageAlternate[] = [];
      for (const locale of i18n.languages) {
        const target = source.getPage(page.slugs, locale);
        if (!target || fallbackOrigin(source, i18n, target)) continue;
        out.push({
          locale,
          hreflang: ctx.siteConfig.hreflang?.[locale] ?? locale,
          href: ctx.absoluteUrl(target.url),
        });
      }
      return out.length > 1 ? out : [];
    },
    async getFallbackOrigin(page) {
      const i18n = ctx.i18nConfig;
      if (i18n) return fallbackOrigin(await ctx.getLoader(), i18n, page);
    },
    getPageBody: (page) => resolve(page, (plugin) => plugin.getPageBody),
    getPageText: (page) => resolve(page, (plugin) => plugin.getPageText),
    getPageToc: (page) => resolve(page, (plugin) => plugin.getPageToc),
    getPageStructuredData: (page) => resolve(page, (plugin) => plugin.getPageStructuredData),
    getPageCreatedAt: (page) => resolve(page, (plugin) => plugin.getPageCreatedAt),
    getPageLastModified: (page) => resolve(page, (plugin) => plugin.getPageLastModified),
    async getPageData(page) {
      const { data } = page;
      const [toc = [], lastModified] = await Promise.all([
        ctx.getPageToc(page),
        ctx.getPageLastModified(page),
      ]);
      let out: DocsPageData = {
        title: data.title ?? page.slugs.at(-1) ?? '',
        description: data.description,
        url: page.url,
        path: page.path,
        locale: page.locale,
        toc,
        // from the frontmatter or content sources
        full: 'full' in data && typeof data.full === 'boolean' ? data.full : undefined,
        lastModified,
        githubUrl: page.absolutePath ? ctx.getFileUrl(page.absolutePath) : undefined,
      };
      for (const plugin of plugins) {
        if (plugin.transformPage) out = await plugin.transformPage.call(ctx, out, page);
      }
      return out;
    },
    getHead: (env) =>
      collect([
        env.page && getPageHead(env.page),
        config.head?.call(ctx, env),
        ...plugins.map((plugin) => plugin.head?.call(ctx, env)),
      ]),
    async getSlots(page) {
      const items = await collect(plugins.map((plugin) => plugin.slots?.call(ctx, { page })));
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const out: Partial<Record<SlotName, SlotItem[]>> = {};
      for (const item of items) (out[item.slot] ??= []).push(item);
      return out;
    },
    async getRoutes() {
      const out: ApiRoute[] = [];
      // `${method} ${path}`
      const handled = new Set<string>();
      for (const route of await collect(plugins.map((plugin) => plugin.routes?.call(ctx)))) {
        const render = route.render ?? (ctx.mode === 'dynamic' ? 'dynamic' : 'static');
        if (render === 'static') {
          const other = route.ALL
            ? 'ALL'
            : methods.find((method) => method !== 'GET' && route[method]);
          if (other)
            throw new Error(
              `[Fumapress] the static route "${route.path}" is generated from its GET handler, its ${other} handler needs \`render: 'dynamic'\` to run on the server.`,
            );
          if (!route.staticPaths && route.path.includes('['))
            throw new Error(
              `[Fumapress] the static route "${route.path}" has params, list the params of its pages in \`staticPaths\`.`,
            );
        }

        for (const method of methods) {
          if (!route[method] && !route.ALL) continue;
          const key = `${method} ${route.path}`;
          if (handled.has(key))
            throw new Error(`[Fumapress] two routes handle ${method} requests to "${route.path}".`);
          handled.add(key);
        }
        out.push({ ...route, render });
      }
      return out;
    },
    handleRequest(request, next) {
      function dispatch(i: number, request: Request, rewrite?: string): Promise<Response> {
        if (i === plugins.length) return next(rewrite);
        const { middleware } = plugins[i];
        if (!middleware) return dispatch(i + 1, request, rewrite);

        return middleware.call(ctx, request, (path) =>
          path === undefined
            ? dispatch(i + 1, request, rewrite)
            : dispatch(i + 1, new Request(new URL(ctx.withBase(path), request.url), request), path),
        );
      }

      return dispatch(0, request);
    },
    async build(output) {
      for (const plugin of plugins) await plugin.build?.call(ctx, output);
    },
    async defaultLayoutProps(env) {
      const props =
        typeof config.defaultLayoutProps === 'function'
          ? await config.defaultLayoutProps.call(ctx, env)
          : (config.defaultLayoutProps ?? {});
      const { name, git } = ctx.siteConfig;

      return {
        ...(git ? addRepoLink(props, git) : props),
        nav: {
          ...props.nav,
          title: props.nav?.title ?? name,
          // Fumadocs UI links the title to `/`, the home of the default language
          url: props.nav?.url ?? ctx.localizePath(env.lang, '/'),
        },
      };
    },
  };

  for (const plugin of plugins) await plugin.init?.call(ctx);

  const { alwaysRevalidate, ...loaderOptions } = config.loaderOptions ?? {};
  let options: PressLoaderOptions = { baseUrl: '/', i18n: ctx.i18nConfig, ...loaderOptions };
  for (const plugin of plugins) {
    if (plugin.configureLoader) options = await plugin.configureLoader.call(ctx, options);
  }
  const loader = dynamicLoader<_Internal.AnyInput, I18nConfig | undefined>(config.content, options);
  ctx.getLoader = () => {
    // `get()` revalidates the invalidated sources
    if (alwaysRevalidate) loader.invalidate();
    return loader.get();
  };
  ctx.revalidateLoader = (name?: string) => loader.revalidate(name);
  ctx.invalidateLoader = (name?: string) => loader.invalidate(name);

  for (const plugin of plugins) await plugin.configure?.call(ctx);

  if (!ctx.siteConfig.baseUrl)
    console.warn(
      '[Fumapress] `site.baseUrl` is not set, URLs in sitemaps, RSS feeds and OG images fall back to relative paths.',
    );
  return ctx;
}
