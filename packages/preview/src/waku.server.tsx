import { createNodeWebSocket, NodeWebSocket } from '@hono/node-ws';
import adapter from 'waku/adapters/node';
import { fsRouter } from 'waku/router/server';
import { startWatcher } from './lib/source/watcher';
import { getConfigRuntime } from './config/load-runtime';
import { encodeEvent, WebSocketEvent } from './lib/waku/hot-reload';
import { filesCache } from './lib/source/storage';
import { serve } from '@hono/node-server';
import { getSource } from './lib/source';

const modules = import.meta.glob('./pages/**/*.{ts,tsx,js,jsx}', {
  base: '/src',
});

const pages = fsRouter(modules);
let nodeWs: NodeWebSocket | undefined;

const v = adapter(pages, {
  middlewareFns: [
    ({ app }) => {
      if (process.env.HOT_RELOAD === '1') {
        nodeWs = createNodeWebSocket({ app });

        void initHotReload().catch((e) => {
          console.error(e);
          process.exit(1);
        });

        app.get(
          '/_ws',
          nodeWs.upgradeWebSocket(() => ({})),
        );
      }

      return (_c, next) => next();
    },
  ],
});

if ('serve' in v) {
  v.serve = ((...args) => {
    const server = serve(...args);
    nodeWs?.injectWebSocket(server);

    for (const signal of ['SIGTERM', 'SIGINT'])
      process.once(signal, () => {
        server.close();
      });

    return server;
  }) as typeof serve;
}

export default v;

async function initHotReload() {
  const wss = nodeWs!.wss;
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
