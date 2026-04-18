import {
  decodeDevEvent,
  encodeDevClientEvent,
  type DevClientEvent,
  type DevServerEvent,
} from './shared';
import { WebSocket, type RawData } from 'ws';

const store = new Map<string, DevServerConnection>();

export function connectDevServer(url: string): DevServerConnection {
  let connection = store.get(url);

  if (!connection) {
    connection = new DevServerConnection(url);
    store.set(url, connection);
  }

  return connection;
}

export class DevServerConnection {
  private readonly listeners = new Set<(event: DevServerEvent) => void>();
  private readonly pendingDirs = new Set<string>();
  private socket?: WebSocket;
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  subscribe(listener: (event: DevServerEvent) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  close() {
    this.socket?.close();
    this.listeners.clear();
    store.delete(this.url);
  }

  watchDir(dir: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'watch',
        absolutePath: dir,
      });
    } else {
      this.pendingDirs.add(dir);
    }
  }

  private connect() {
    if (this.socket) return;
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.on('open', () => {
      console.log(`[@fumadocs/local-md] connected to dev server at ${this.url}`);
      for (const dir of this.pendingDirs) {
        this.send({
          type: 'watch',
          absolutePath: dir,
        });
      }
      this.pendingDirs.clear();
    });

    socket.on('message', (data) => {
      const decoded = decodeDevEvent(rawDataToString(data));
      if (decoded) this.emit(decoded);
    });

    socket.on('close', () => {
      this.socket = undefined;
      console.log(`[@fumadocs/local-md] disconnected from dev server at ${this.url}`);
    });

    socket.on('error', (e) => {
      console.error(e);
    });
  }

  private emit(event: DevServerEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private send(message: DevClientEvent) {
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
