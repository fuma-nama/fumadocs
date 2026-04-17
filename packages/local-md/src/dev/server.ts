import { type ChokidarOptions, type FSWatcher, watch } from 'chokidar';
import ignore, { type Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  decodeDevClientEvent,
  encodeDevEvent,
  getDevServerUrl,
  LOCAL_MD_DEV_PATH,
  type DevServerEvent,
  type DevWatchEvent,
} from './shared';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

const WATCH_EVENTS = new Set<DevWatchEvent>(['add', 'addDir', 'change', 'unlink', 'unlinkDir']);
type IgnoredFn = (value: string) => boolean;

export interface DevServerOptions {
  port: number;
  host?: string;
  /**
   * customise chokidar, by default, file watcher will watch all files under the `dir` directory.
   */
  watchOptions?: (options: ChokidarOptions) => ChokidarOptions;
}

export interface DevServerHandle {
  port: number;
  host: string;
  watcher: FSWatcher;
  watchDir: (dir: string) => Promise<void>;
  close: () => Promise<void>;
}

export async function startDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port;
  const rootIgnored = await fromGitIgnore(process.cwd(), 'node_modules\ndist\nbuild');

  let watchOptions: ChokidarOptions = {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: (value) => {
      if (rootIgnored?.(value)) return true;
      return false;
    },
  };
  if (options.watchOptions) {
    watchOptions = options.watchOptions(watchOptions);
  }

  const watcher = watch([], watchOptions);
  const clients = new Map<WebSocket, Set<string>>();
  const watchedDirs = new Map<string, number>();
  const wsServer = new WebSocketServer({
    path: LOCAL_MD_DEV_PATH,
    port,
    host,
  });

  function broadcast(event: DevServerEvent) {
    const encoded = encodeDevEvent(event);

    for (const client of clients.keys()) {
      if (client.readyState !== WebSocket.OPEN) {
        clients.delete(client);
        continue;
      }

      client.send(encoded);
    }
  }

  wsServer.on('connection', (client) => {
    clients.set(client, new Set());
    client.send(
      encodeDevEvent({
        type: 'connected',
        timestamp: Date.now(),
      }),
    );

    client.on('message', async (data) => {
      const decoded = decodeDevClientEvent(rawDataToString(data));
      if (!decoded) return;

      if (decoded.type === 'watch') {
        try {
          await addClientDir(client, decoded.absolutePath);
        } catch (error) {
          client.send(
            encodeDevEvent({
              type: 'error',
              message: error instanceof Error ? error.message : String(error),
              timestamp: Date.now(),
            }),
          );
        }
      }
    });

    client.on('close', () => {
      void removeClientDirs(client);
      clients.delete(client);
    });
  });

  watcher.on('all', (event, filePath) => {
    if (!WATCH_EVENTS.has(event as DevWatchEvent)) return;

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
    wsServer.once('error', reject);
    wsServer.on('listening', () => {
      wsServer.off('error', reject);
      console.log(`[@fumadocs/local-md] dev server is ready at ${getDevServerUrl(port, host)}`);
      resolve();
    });
  });

  return {
    port,
    host,
    watcher,
    watchDir: addWatchDir,
    async close() {
      for (const client of clients.keys()) {
        client.close();
      }
      clients.clear();
      wsServer.close();

      await watcher.close();
      await new Promise<void>((resolve, reject) => {
        wsServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };

  async function addClientDir(client: WebSocket, dir: string) {
    const absolutePath = path.resolve(dir);
    const dirs = clients.get(client);
    if (!dirs || dirs.has(absolutePath)) return;

    dirs.add(absolutePath);
    await addWatchDir(absolutePath);
  }

  async function addWatchDir(dir: string) {
    const absolutePath = path.resolve(dir);
    const count = watchedDirs.get(absolutePath) ?? 0;
    if (count === 0) watcher.add(absolutePath);

    watchedDirs.set(absolutePath, count + 1);
  }

  async function removeClientDirs(client: WebSocket) {
    const dirs = clients.get(client);
    if (!dirs) return;

    for (const dir of dirs) removeWatchDir(dir);
    dirs.clear();
  }

  function removeWatchDir(dir: string) {
    const absolutePath = path.resolve(dir);
    const count = watchedDirs.get(absolutePath);
    if (!count) return;

    if (count === 1) {
      watchedDirs.delete(absolutePath);
      watcher.unwatch(absolutePath);
      return;
    }

    watchedDirs.set(absolutePath, count - 1);
  }
}

async function fromGitIgnore(dir: string, defaultValue?: string): Promise<IgnoredFn | undefined> {
  const gitignore = await fs
    .readFile(path.join(dir, '.gitignore'), 'utf-8')
    .catch(() => defaultValue);

  if (gitignore) {
    const ig = ignore();
    ig.add(gitignore);
    return toMatcher(dir, ig);
  }
}

function toMatcher(dir: string, ig: Ignore): IgnoredFn {
  return (v) => {
    const relativePath = path.relative(dir, v);
    // for invalid path, don't ignore
    return ignore.isPathValid(relativePath) && ig.checkIgnore(relativePath).ignored;
  };
}

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');

  return data.toString('utf8');
}
