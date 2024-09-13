import { WebSocketServer } from 'ws';
import { type UpdateMessage, watch } from '@/github/dev/watcher';

export interface ServerOptions {
  /**
   * Files to watch
   *
   * By default, include all files under `./content`
   */
  files?: string[];

  /**
   * Port to listen
   *
   * @defaultValue 3001
   */
  port?: number;
}

export type WebSocketServerMessage = UpdateMessage;

/**
 * Create MDX Remote development server
 */
export function createServer({
  files = ['./content'],
  port = 3001,
}: ServerOptions): void {
  const wss = new WebSocketServer({
    port,
  });

  wss.on('listening', () => {
    console.log(`Development Server listening on port ${port.toString()}`);
  });

  const watcher = watch({
    files,
    onChange(message) {
      console.log(`Updated Content: ${message.path}`);
      wss.clients.forEach((c) => {
        c.send(JSON.stringify(message));
      });
    },
  });

  process.on('exit', () => {
    console.log('Closing Development Server');
    wss.close();
    void watcher.close();
  });
}

export interface InitServerOptions extends ServerOptions {
  /**
   * Should enable development server
   *
   * Enabled by default in development mode
   */
  enabled?: boolean;
}

/**
 * Initialize and start the development server when necessary
 */
export function initServer(options: InitServerOptions = {}): void {
  const { enabled = process.env.NODE_ENV === 'development', ...rest } = options;

  if (!process.env.ND_DEV_SERVER_STARTED && enabled) {
    process.env.ND_DEV_SERVER_STARTED = '1';
    createServer(rest);
  }
}
