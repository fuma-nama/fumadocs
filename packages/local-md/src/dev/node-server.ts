import { type ChokidarOptions, type FSWatcher, watch } from 'chokidar';
import {
  decodeDevClientEvent,
  encodeDevEvent,
  LOCAL_MD_DEV_PATH,
  type WatchDirOptions,
  type DevServerEvent,
  type DevWatchEvent,
} from './shared';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import path from 'node:path';
import picomatch, { type Matcher } from 'picomatch';

const WATCH_EVENTS = new Set<DevWatchEvent>(['add', 'addDir', 'change', 'unlink', 'unlinkDir']);

export interface DevServerOptions {
  port: number;
  host?: string;
  /**
   * customize chokidar, by default, file watcher will watch all files under the `dir` directory.
   */
  watchOptions?: (options: ChokidarOptions) => ChokidarOptions;
}

export interface DevServerHandle {
  url: string;
  port: number;
  host: string;
  watcher: FSWatcher;
  close: () => Promise<void>;
}

export async function startDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  const { host = '127.0.0.1', port } = options;
  const url = `ws://${host}:${port}${LOCAL_MD_DEV_PATH}`;

  let watchOptions: ChokidarOptions = {
    ignoreInitial: true,
    followSymlinks: false,
    ignored(file) {
      for (const client of clients) {
        for (const [dir, { matcher }] of client.watching) {
          if (matcher(path.relative(dir, file))) return false;
        }
      }
      return true;
    },
  };
  if (options.watchOptions) {
    watchOptions = options.watchOptions(watchOptions);
  }

  const watcher = watch([], watchOptions);
  const clients = new Set<Client>();
  const wss = new WebSocketServer({
    path: LOCAL_MD_DEV_PATH,
    port,
    host,
  });

  function broadcast(event: DevServerEvent) {
    const encoded = encodeDevEvent(event);

    for (const client of clients) {
      if (client.socket.readyState !== WebSocket.OPEN) {
        clients.delete(client);
        continue;
      }

      client.socket.send(encoded);
    }
  }

  wss.on('connection', (_client) => {
    const client = new Client(_client);
    clients.add(client);

    _client.on('message', async (data) => {
      const decoded = decodeDevClientEvent(rawDataToString(data));
      if (!decoded) return;

      if (decoded.type === 'watch-dir') {
        const absolutePath = path.resolve(decoded.dir);

        if (!client.watching.has(absolutePath)) {
          client.addWatching(absolutePath, decoded);
          watcher.add(absolutePath);
        }
      }
    });

    _client.on('close', () => {
      clients.delete(client);
      for (const dir of client.watching.keys()) removeWatchDir(dir);
    });
  });

  watcher.on('all', (event, filePath) => {
    if (!WATCH_EVENTS.has(event as DevWatchEvent)) return;
    console.log(`[@fumadocs/local-md] ${event} at "${filePath}"`);

    broadcast({
      type: 'change',
      event: event as DevWatchEvent,
      absolutePath: filePath,
      timestamp: Date.now(),
    });
  });

  watcher.on('error', (error) => {
    broadcast({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    });
  });

  await new Promise<void>((resolve, reject) => {
    wss.once('error', reject);
    wss.on('listening', () => {
      wss.off('error', reject);
      console.log(`[@fumadocs/local-md] dev server is ready at ${url}`);
      resolve();
    });
  });

  return {
    url,
    port,
    host,
    watcher,
    async close() {
      for (const client of clients) client.close();
      clients.clear();
      wss.close();

      await watcher.close();
      await new Promise<void>((resolve, reject) => {
        wss.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };

  function removeWatchDir(dir: string) {
    let hasReference = false;
    for (const client of clients) {
      if (client.watching.has(dir)) {
        hasReference = true;
        break;
      }
    }

    if (!hasReference) {
      watcher.unwatch(dir);
    }
  }
}

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');

  return data.toString('utf8');
}

class Client {
  /** dir -> options */
  readonly watching = new Map<string, { matcher: Matcher }>();

  constructor(readonly socket: WebSocket) {}

  addWatching(dir: string, options: WatchDirOptions) {
    this.watching.set(dir, { matcher: picomatch(options.includes) });
  }

  close() {
    this.socket.close();
  }
}
