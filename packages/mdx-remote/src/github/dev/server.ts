import { WebSocketServer } from 'ws';
import { UpdateMessage, watch } from '@/github/dev/watcher';

export interface ServerOptions {
  files: string[];
  port?: number;
}

export type WebSocketServerMessage = UpdateMessage;

/**
 * Create development server
 */
export function createServer({ files, port = 3001 }: ServerOptions): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn(
      `'createServer()' is being invoked on ${process.env.NODE_ENV ?? 'unknown'} mode, it should be only used on development mode.`,
    );
  }

  const wss = new WebSocketServer({
    port,
  });

  const watcher = watch({
    files,
    onChange(message) {
      wss.clients.forEach((c) => {
        c.send(JSON.stringify(message));
      });
    },
  });

  process.on('SIGINT', () => {
    wss.close();
    void watcher?.close();
  });

  process.on('beforeExit', () => {
    wss.close();
    void watcher?.close();
  });
}

let created = false;

/**
 * Initialize development server when necessary
 */
export function initServer(options: ServerOptions): void {
  if (created) return;

  createServer(options);
  created = true;
}
