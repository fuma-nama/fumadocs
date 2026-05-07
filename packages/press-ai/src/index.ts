import { ServerPlugin } from '@fumapress/core/plugins';
import { AIRouteOptions, createRouteHandler } from './api';
import { ConfigContext } from '@fumapress/core';

export function aiPlugin<C extends ConfigContext = ConfigContext>(
  options: AIRouteOptions<C>,
): ServerPlugin {
  return {
    createPages({ createApi }) {
      const { onRequest } = createRouteHandler(options, this as never);

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
