import {
  decodeDevEvent,
  encodeDevClientEvent,
  getDevServerPort,
  getDevServerUrl,
  type DevServerEvent,
} from './shared';
import { WebSocket, type RawData } from 'ws';

export interface DevServerConnection {
  readonly port: number;
  readonly url: string;
  readonly connected: boolean;
  readonly lastEvent?: DevServerEvent;
  subscribe: (listener: (event: DevServerEvent) => void) => () => void;
  watchDir: (dir: string) => void;
  close: () => void;
}

const STORE_KEY = Symbol.for('__fumadocs_local_md_dev_connections__');

export function connectDevServer(port = getDevServerPort()): DevServerConnection {
  if (!port) {
    throw new Error('Missing local-md dev server port');
  }

  const url = getDevServerUrl(port);
  const store = getStore();
  let connection = store.get(url);

  if (!connection) {
    connection = new SharedDevServerConnection(port, url);
    store.set(url, connection);
  }

  return connection;
}

class SharedDevServerConnection implements DevServerConnection {
  readonly listeners = new Set<(event: DevServerEvent) => void>();
  readonly watchedDirs = new Set<string>();
  readonly port: number;
  readonly url: string;
  connected = false;
  lastEvent?: DevServerEvent;

  private socket?: WebSocket;
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(port: number, url: string) {
    this.port = port;
    this.url = url;
    this.connect();
  }

  subscribe(listener: (event: DevServerEvent) => void) {
    this.listeners.add(listener);

    if (this.lastEvent) {
      listener(this.lastEvent);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  close() {
    this.connected = false;
    clearTimeout(this.retryTimer);
    this.socket?.close();
    this.listeners.clear();
    getStore().delete(this.url);
  }

  watchDir(dir: string) {
    this.watchedDirs.add(dir);
    this.send({
      type: 'watch',
      absolutePath: dir,
    });
  }

  private connect() {
    if (this.socket) return;
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.on('open', () => {
      this.connected = true;
      console.log(`[@fumadocs/local-md] connected to dev server at ${this.url}`);
      for (const dir of this.watchedDirs) {
        this.send({
          type: 'watch',
          absolutePath: dir,
        });
      }
    });

    socket.on('message', (data) => {
      const decoded = decodeDevEvent(rawDataToString(data));
      if (decoded) this.emit(decoded);
    });

    socket.on('close', () => {
      this.connected = false;
      this.socket = undefined;
      console.log(`[@fumadocs/local-md] disconnected from dev server at ${this.url}`);
    });

    socket.on('error', (e) => {
      console.error(e);
    });
  }

  private emit(event: DevServerEvent) {
    this.lastEvent = event;

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private send(message: { type: 'watch'; absolutePath: string }) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    this.socket.send(encodeDevClientEvent(message));
  }
}

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');

  return data.toString('utf8');
}

function getStore() {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, SharedDevServerConnection>;
  };

  globalStore[STORE_KEY] ??= new Map<string, SharedDevServerConnection>();
  return globalStore[STORE_KEY];
}
