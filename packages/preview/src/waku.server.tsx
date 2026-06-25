import adapter from 'waku/adapters/node';
import { fsRouter } from 'waku/router/server';
import { startWatcher } from './lib/source/watcher';
import { getConfigRuntime } from './config/load-runtime';
import { encodeEvent, WebSocketEvent } from './lib/waku/hot-reload';
import { filesCache } from './lib/source/storage';
import { getSource } from './lib/source';
import { WebSocketServer } from 'ws';
import { serve, upgradeWebSocket } from '@hono/node-server';

const modules = import.meta.glob('./pages/**/*.{ts,tsx,js,jsx}', {
  base: '/src',
});

const pages = fsRouter(modules);
let nodeWs: WebSocketServer | undefined;

const v = adapter(pages, {
  middlewareFns: [
    ({ app }) => {
      if (process.env.HOT_RELOAD === '1') {
        nodeWs = new WebSocketServer({ noServer: true });

        void initHotReload().catch((e) => {
          console.error(e);
          process.exit(1);
        });

        app.get(
          '/_ws',
          upgradeWebSocket(() => ({})),
        );
      }

      return (_c, next) => next();
    },
  ],
});

if ('serve' in v) {
  v.serve = ((opts, listener) => {
    const server = serve(
      {
        ...opts,
        websocket: nodeWs
          ? {
              server: nodeWs,
            }
          : undefined,
      },
      listener,
    );

    for (const signal of ['SIGTERM', 'SIGINT'])
      process.once(signal, () => {
        server.close();
      });

    return server;
  }) as typeof serve;
}

export default v;

async function initHotReload() {
  const wss = nodeWs!;
  const watcher = await startWatcher(await getConfigRuntime());

  function send(event: WebSocketEvent) {
    const encoded = encodeEvent(event);

    for (const client of wss.clients) client.send(encoded);
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
