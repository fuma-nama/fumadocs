import { WebSocketServer } from 'ws';
import { type UpdateMessage, watch } from '@/github/dev/watcher';

export interface ServerOptions {
  files: string[];
  port?: number;
}

export type WebSocketServerMessage = UpdateMessage;

/**
 * Create development server
 */
export function createServer({ files, port = 3001 }: ServerOptions): void {
  // running the script via node may not include the `NODE_ENV` by default

  process.env.NODE_ENV ??= 'development';
  if (process.env.NODE_ENV !== 'development') {
    console.warn(
      `'createServer()' is being invoked on ${process.env.NODE_ENV} mode, it should be only used on development mode.`,
    );
  }

  const wss = new WebSocketServer({
    port,
  });

  wss.on('listening', () => {
    console.log(`Development Server listening on port ${port.toString()}`);
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
    void watcher.close();
  });

  process.on('beforeExit', () => {
    wss.close();
    void watcher.close();
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
