import * as waku from 'waku';
import { AppContext, parseConfig } from './lib/shared';
import { type ComponentType, createElement, type ReactNode } from 'react';
import type { Config, ConfigContext } from './config';
import { unstable_redirect } from 'waku/router/server';
import { RouteFns } from './lib/types';

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

  const createPages: typeof waku.createPages = (base, createPagesOptions) => {
    return waku.createPages(async (_fns) => {
      const { context, ...layouts } = await init();

      const fns: RouteFns = {
        ..._fns,
        createApiIsomorphic(config) {
          if (config.render === 'static') {
            _fns.createApi({
              render: 'static',
              method: 'GET',
              staticPaths: config.staticPaths,
              path: config.path,
              handler: config.handler,
            });
          } else {
            _fns.createApi({
              render: 'dynamic',
              path: config.path,
              handlers: {
                GET: config.handler,
              },
            });
          }
        },
      };

      await base(fns);
      for (const plugin of context.plugins) {
        await plugin.createPages?.call(context as unknown as AppContext, fns);
      }

      const defaultRenderMode = context.mode === 'dynamic' ? 'dynamic' : 'static';

      if (context.i18nConfig) {
        fns.createRoot({
          render: defaultRenderMode,
          component({ children }) {
            return children;
          },
        });
        fns.createLayout({
          render: defaultRenderMode,
          path: '/[lang]',
          component({ children, lang }) {
            return createElement(layouts.root, { lang, children, ...context });
          },
        });

        fns.createPage({
          render: defaultRenderMode,
          path: '/[lang]/[...slugs]',
          staticPaths: (await context.getLoader())
            .getPages()
            .map((page) => [page.locale!, ...page.slugs]),
          component({ slugs, lang }) {
            return createElement(layouts.page, { lang, slugs, ...context });
          },
        });

        fns.createPage({
          render: defaultRenderMode,
          path: '/[lang]/404',
          staticPaths: Object.keys(context.i18nConfig.languages),
          component({ lang }) {
            return createElement(layouts.notFound, { lang, ...context });
          },
        });

        if (context.mode !== 'static') {
          // must be dynamic because of redirects
          fns.createPage({
            render: 'dynamic',
            path: '/404',
            component() {
              unstable_redirect(`/${context.i18nConfig!.defaultLanguage}`);
            },
          });
        }
      } else {
        fns.createRoot({
          render: defaultRenderMode,
          component({ children }) {
            return createElement(layouts.root, { children, ...context });
          },
        });

        fns.createPage({
          render: defaultRenderMode,
          path: '/[...slugs]',
          staticPaths: (await context.getLoader()).getPages().map((page) => page.slugs),
          component({ slugs }) {
            return createElement(layouts.page, { slugs, ...context });
          },
        });

        fns.createPage({
          render: defaultRenderMode,
          staticPaths: [],
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
