import type { BuildMode, Config, ConfigContext, I18nConfig } from '@/config';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getGitRootDir } from './fs';
import path from 'node:path';
import type { LoaderOutput, Page } from 'fumadocs-core/source';
import type { Awaitable, Adapter, ServerPlugin } from './types';
import type { DocsLayoutContextData } from '@/layouts/docs';
import { createElement, Fragment, type ReactNode } from 'react';
import type { HomeLayoutContextData } from '@/layouts/home';
import { fumadocsMdx } from '@/adapters/mdx';
import type { RootProviderProps } from 'fumadocs-ui/provider/waku';

export interface AppContext<C extends ConfigContext = ConfigContext> {
  mode: BuildMode;
  getLoader: () => Awaitable<LoaderOutput<C['loaderConfig']>>;
  plugins: ServerPlugin[];
  adapters: Adapter[];

  /** always `undefined`, easier way to infer types */
  $context: C;

  /**
   * custom data in app context, can be referenced from plugins/pages etc
   */
  data: AppContextData & Record<string, unknown>;

  i18nConfig?: I18nConfig;
  metaConfig?: Config['meta'];
  siteConfig: {
    name: string;
    git?: {
      user: string;
      repo: string;
      branch: string;
      rootDir: string;
    };
  };
}

export interface AppContextData {
  'core:page-meta'?: ((page: Page) => ReactNode)[];
  'core:docs-layout'?: DocsLayoutContextData;
  'core:home-layout'?: HomeLayoutContextData;
  'core:provider'?: ((props: RootProviderProps) => Awaitable<RootProviderProps>)[];
}

export function parseConfig<C extends ConfigContext>(config: Config<C>): AppContext<C> {
  const context: AppContext<C> = {
    getLoader() {
      if (typeof config.loader === 'function') return config.loader();

      return config.loader;
    },
    plugins: Array.isArray(config.plugins) ? config.plugins : [],
    adapters: config.adapters ?? [fumadocsMdx()],
    $context: undefined as never,
    data: {},
    i18nConfig: config.i18n,
    mode: config.mode ?? 'default',
    metaConfig: config.meta as Config['meta'],
    siteConfig: {
      name: config.site?.name ?? 'Fumapress',
      git: config.site?.git
        ? {
            ...config.site.git,
            rootDir: config.site.git.rootDir ?? getGitRootDir() ?? process.cwd(),
          }
        : undefined,
    },
  };

  if (typeof config.plugins === 'function') {
    context.plugins = config.plugins(context);
  }

  return context;
}

export function renderRootMeta(context: AppContext): ReactNode {
  return context.metaConfig?.root?.call(context);
}

export function renderPageMeta(page: Page, context: AppContext): ReactNode {
  return (
    <>
      <title>{page.data.title}</title>
      <meta property="og:title" content={page.data.title} />
      {page.data.description && <meta property="og:description" content={page.data.description} />}
      {context.metaConfig?.page?.call(context, page)}
      {context.data['core:page-meta']?.map((hook, i) => (
        <Fragment key={i}>{hook(page)}</Fragment>
      ))}
    </>
  );
}

export function getGitHubFileUrl(ctx: AppContext, absolutePath: string): string | undefined {
  const { git } = ctx.siteConfig;
  if (!git) return;

  const p = path.relative(git.rootDir, absolutePath).replaceAll(path.sep, '/');
  if (p.startsWith('../')) return;

  return `https://github.com/${git.user}/${git.repo}/blob/${git.branch}/${p}`;
}

export function baseOptions(ctx: AppContext): BaseLayoutProps {
  const { name, git } = ctx.siteConfig;

  return {
    nav: {
      title: name,
    },
    githubUrl: git ? `https://github.com/${git.user}/${git.repo}` : undefined,
  };
}
