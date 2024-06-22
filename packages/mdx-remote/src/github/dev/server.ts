import { WebSocketServer } from 'ws';
import type { FSWatcher } from 'chokidar';
import { watch } from '@/github/dev/watcher';

export function createServer({
  files,
  port = 8081,
}: {
  files: string[];
  port?: number;
}): void {
  const wss = new WebSocketServer({
    port,
  });

  let watcher: FSWatcher | undefined;

  wss.on('connection', (ws) => {
    watcher = watch({
      files,
      onChange(message) {
        ws.send(JSON.stringify(message));
      },
    });
  });

  process.on('exit', () => {
    void watcher?.close();
  });
}
