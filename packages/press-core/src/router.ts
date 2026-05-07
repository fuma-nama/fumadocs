import * as waku from 'waku';
import { AppContext, parseConfig } from './lib/shared';
import { type ComponentType, createElement, type ReactNode } from 'react';
import type { Config, ConfigContext } from './config';
import { createDocsLayout } from './layouts/docs';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';

export interface RouterOptions<C extends ConfigContext = ConfigContext> {
  root?: ComponentType<AppContext<C> & { children: ReactNode }>;
  page?: ComponentType<AppContext<C> & { slugs: string[] }>;
  notFound?: ComponentType<AppContext<C>>;
}

export function createRouter<C extends ConfigContext>(
  rawConfig: Config<C>,
  options: RouterOptions<NoInfer<C>> = {},
): {
  extend: typeof waku.createPages;
  createPages: () => ReturnType<typeof waku.createPages>;
} {
  const layoutRoot =
    options.root ??
    (async (props) => {
      const mod = await import('./layouts/root');
      return createElement(mod.default, props);
    });

  const layoutPage =
    options.page ??
    createDocsLayout({
      async render(page) {
        if ('load' in page.data && typeof page.data.load === 'function') {
          const loader = await this.getLoader();
          const { body: Mdx, toc } = await page.data.load();

          if (typeof Mdx === 'function')
            return {
              toc,
              body: createElement(Mdx, {
                components: {
                  ...defaultMdxComponents,
                  a: createRelativeLink(loader, page),
                },
              }),
            };
        }

        throw new Error('[Fumapress] Please specify `layouts.page` in your config');
      },
    });

  const layoutNotFound =
    options.notFound ??
    (async () => {
      const mod = await import('./layouts/not-found');
      return mod.default();
    });

  function init() {
    const context: AppContext<C> = {
      config: parseConfig(rawConfig),
      getLoader() {
        if (typeof rawConfig.loader === 'function') return rawConfig.loader();

        return rawConfig.loader;
      },
      plugins: Array.isArray(rawConfig.plugins) ? rawConfig.plugins : [],
      $context: undefined as never,
      data: {},
    };

    if (typeof rawConfig.plugins === 'function') {
      context.plugins = rawConfig.plugins(context);
    }

    for (const plugin of context.plugins) {
      plugin.init?.call(context as unknown as AppContext);
    }

    return context;
  }

  const createPages: typeof waku.createPages = (fns, _o) => {
    return waku.createPages(async (r) => {
      const context = init();
      const { createPage, createRoot } = r;

      await fns(r);
      for (const plugin of context.plugins) {
        await plugin.createPages?.call(context as unknown as AppContext, r);
      }

      createRoot({
        render: 'static',
        component(props) {
          return createElement(layoutRoot, { ...props, ...context });
        },
      });
      createPage({
        render: 'static',
        path: '/[...slugs]',
        staticPaths: (await context.getLoader()).getPages().map((page) => page.slugs),
        component({ slugs }) {
          return createElement(layoutPage, { slugs, ...context });
        },
      });
      createPage({
        render: 'static',
        path: '/404',
        component() {
          return createElement(layoutNotFound, context);
        },
      });

      return null as never;
    }, _o);
  };

  return {
    extend: createPages,
    createPages() {
      return createPages(() => null as never);
    },
  };
}
