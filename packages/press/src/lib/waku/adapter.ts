import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import type { MiddlewareHandler } from 'hono';
import { Hono } from 'hono/tiny';
import { unstable_createServerEntryAdapter as createServerEntryAdapter } from 'waku/adapter-builders';
import {
  unstable_constants as constants,
  unstable_honoMiddleware as honoMiddleware,
} from 'waku/internals';
import type { BuildOptions } from 'waku/adapters/node-build-enhancer';
import { createNodeWebSocket } from '@hono/node-ws';
import { startWatcher } from '../source/watcher';
import { getConfigRuntime } from '@/config/load-runtime';
import { type WSContext } from 'hono/ws';
import { encodeEvent, WebSocketEvent } from './hot-reload';
import { filesCache } from '../source/storage';
import { getSource } from '../source';

const { DIST_PUBLIC } = constants;
const { contextMiddleware, rscMiddleware, middlewareRunner } = honoMiddleware;

export default createServerEntryAdapter(
  (
    { processRequest, processBuild, config, isBuild, notFoundHtml },
    options?: {
      middlewareFns?: (() => MiddlewareHandler)[];
      middlewareModules?: Record<string, () => Promise<unknown>>;
    },
  ) => {
    const { middlewareFns = [], middlewareModules = {} } = options || {};
    const app = new Hono();
    let serveFn = serve;

    app.notFound((c) => {
      if (notFoundHtml) {
        return c.html(notFoundHtml, 404);
      }
      return c.text('404 Not Found', 404);
    });
    if (isBuild) {
      app.use(
        `${config.basePath}*`,
        serveStatic({
          root: path.join(config.distDir, DIST_PUBLIC),
          rewriteRequestPath: (path) => path.slice(config.basePath.length - 1),
        }),
      );
    }

    if (isBuild && process.env.HOT_RELOAD === '1') {
      const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
      const clients = new Set<WSContext>();

      void initHotReload(clients).catch((e) => {
        console.error(e);
        process.exit(1);
      });

      app.get(
        '/_ws',
        upgradeWebSocket(() => ({
          onOpen(_, ws) {
            clients.add(ws);
          },
          onClose(_, ws) {
            clients.delete(ws);
          },
        })),
      );

      serveFn = (...args) => {
        const server = serve(...args);
        injectWebSocket(server);

        for (const signal of ['SIGTERM', 'SIGINT'])
          process.once(signal, () => {
            server.close();
          });

        return server;
      };
    }

    app.use(contextMiddleware() as never);
    for (const middlewareFn of middlewareFns) {
      app.use(middlewareFn());
    }

    app.use(middlewareRunner(middlewareModules as never) as never);
    app.use(rscMiddleware({ processRequest }) as never);
    const buildOptions: BuildOptions = {
      distDir: config.distDir,
    };

    return {
      fetch: app.fetch,
      build: processBuild,
      buildOptions,
      buildEnhancers: ['waku/adapters/node-build-enhancer'],
      serve: serveFn,
    };
  },
);

async function initHotReload(clients: Set<WSContext>) {
  const watcher = await startWatcher(await getConfigRuntime());

  function send(event: WebSocketEvent) {
    const encoded = encodeEvent(event);

    for (const client of clients) client.send(encoded);
  }

  watcher.on('all', (event, filePath) => {
    switch (event) {
      case 'change':
      case 'unlink':
        // if file wasn't parsed, no revalidation is needed
        if (!filesCache.has(filePath)) return;
    }

    if (event === 'change') {
      filesCache.delete(filePath);
      send({
        type: 'clear-cache',
        absolutePath: filePath,
      });
    }

    switch (event) {
      case 'add':
      case 'change':
      case 'unlink':
        getSource.revalidate(false);
        send({
          type: 'revalidate',
        });
        break;
    }
  });

  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
      watcher.close();
    });
}
