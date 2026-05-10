import { type AIRouteOptions, createRouteHandler } from './api';
import type { ConfigContext, ServerPlugin } from 'fumapress';
import { createElement } from 'react';

export interface AIOptions<C extends ConfigContext = ConfigContext> extends AIRouteOptions<C> {
  /** @default true */
  configureUI?: boolean;
}

export function aiPlugin<C extends ConfigContext = ConfigContext>(
  options: AIOptions<C>,
): ServerPlugin {
  const { configureUI = true } = options;
  return {
    init() {
      if (configureUI) {
        this.data['core:docs-layout'] ??= {};
        const renderers = (this.data['core:docs-layout'].renderers ??= []);
        renderers.push(async (data) => {
          const { DefaultComponent } = await import('./components/default');
          data.layoutProps.children = [data.layoutProps.children, createElement(DefaultComponent)];
          return data;
        });
      }
    },
    createPages({ createApi }) {
      const { onRequest } = createRouteHandler(options, this as never);

      if (this.mode === 'static') {
        throw new Error(
          "[Fumapress] the @fumapress/ai plugin is not compatible with mode: 'static'",
        );
      }

      createApi({
        path: '/api/ai',
        render: 'dynamic',
        handlers: {
          POST: onRequest,
        },
      });
    },
  };
}

export type { SearchTool, AIRouteOptions, ChatUIMessage } from './api';
