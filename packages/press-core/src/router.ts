import * as waku from 'waku';
import { AppContext, parseConfig } from './lib/shared';
import { type ComponentType, createElement, type ReactNode } from 'react';
import type { Config, ConfigContext } from './config';
import { unstable_redirect } from 'waku/router/server';

export type RouterOptions<C extends ConfigContext = ConfigContext> = Partial<Layouts<C>>;

export interface Layouts<C extends ConfigContext = ConfigContext> {
  root: ComponentType<AppContext<C> & { lang?: string; children: ReactNode }>;
  page: ComponentType<AppContext<C> & { lang?: string; slugs: string[] }>;
  notFound: ComponentType<AppContext<C> & { lang?: string }>;
}

export function createRouter<C extends ConfigContext>(
  rawConfig: Config<C>,
  options: RouterOptions<NoInfer<C>> = {},
): {
  extend: typeof waku.createPages;
  createPages: () => ReturnType<typeof waku.createPages>;
} {
  async function init(): Promise<{ context: AppContext<C> } & Layouts<C>> {
    const context: AppContext<C> = parseConfig(rawConfig);

    for (const plugin of context.plugins) {
      plugin.init?.call(context as unknown as AppContext);
    }

    return {
      context,
      root: options.root ?? (await import('./layouts/root')).createRootLayout<C>(),
      page: options.page ?? (await import('./layouts/docs')).createDocsLayout<C>(),
      notFound:
        options.notFound ?? (await import('fumadocs-ui/layouts/home/not-found')).DefaultNotFound,
    };
  }

  const createPages: typeof waku.createPages = (fns, createPagesOptions) => {
    return waku.createPages(async (r) => {
      const { context, ...layouts } = await init();
      const { createPage, createLayout, createRoot } = r;

      await fns(r);
      for (const plugin of context.plugins) {
        await plugin.createPages?.call(context as unknown as AppContext, r);
      }

      if (context.i18nConfig) {
        createRoot({
          render: 'static',
          component({ children }) {
            return children;
          },
        });
        createLayout({
          render: 'static',
          path: '/[lang]',
          component({ children, lang }) {
            return createElement(layouts.root, { lang, children, ...context });
          },
        });

        createPage({
          render: 'static',
          path: '/[lang]/[...slugs]',
          staticPaths: (await context.getLoader())
            .getPages()
            .map((page) => [page.locale!, ...page.slugs]),
          component({ slugs, lang }) {
            return createElement(layouts.page, { lang, slugs, ...context });
          },
        });

        createPage({
          render: 'static',
          path: '/[lang]/404',
          staticPaths: Object.keys(context.i18nConfig.languages),
          component({ lang }) {
            return createElement(layouts.notFound, { lang, ...context });
          },
        });

        // must be dynamic because of redirects
        createPage({
          render: 'dynamic',
          path: '/404',
          component() {
            unstable_redirect(`/${context.i18nConfig!.defaultLanguage}`);
          },
        });
      } else {
        createRoot({
          render: 'static',
          component({ children }) {
            return createElement(layouts.root, { children, ...context });
          },
        });

        createPage({
          render: 'static',
          path: '/[...slugs]',
          staticPaths: (await context.getLoader()).getPages().map((page) => page.slugs),
          component({ slugs }) {
            return createElement(layouts.page, { slugs, ...context });
          },
        });
        createPage({
          render: 'static',
          path: '/404',
          component() {
            return createElement(layouts.notFound, context);
          },
        });
      }

      return null as never;
    }, createPagesOptions);
  };

  return {
    extend: createPages,
    createPages() {
      return createPages(() => null as never);
    },
  };
}
