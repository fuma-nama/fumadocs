import path from 'node:path';
import { type FSWatcher, watch as watchFn } from 'chokidar';
import { type EventName } from 'chokidar/handler.js';

export interface WatchOptions {
  files: string[];
  cwd?: string;
  onChange: (message: UpdateMessage) => void;
}

export type UpdateMessage =
  | {
      type: 'add';
      path: string;
    }
  | {
      type: 'delete';
      path: string;
    }
  | {
      type: 'update';
      path: string;
    };

export function watch(options: WatchOptions): FSWatcher {
  const { cwd = process.cwd(), files } = options;
  const watcher = watchFn(files, { cwd, ignoreInitial: true });

  watcher.on('error', (e) => {
    console.error('Development Server failed to start', e);
  });

  watcher.on('all', (event: EventName, relativePath: string) => {
    const absolutePath = path.resolve(cwd, relativePath);

    if (event === 'add') {
      options.onChange({
        type: 'add',
        path: absolutePath,
      });
    }

    if (event === 'unlink') {
      options.onChange({
        type: 'delete',
        path: absolutePath,
      });
    }

    if (event === 'change') {
      options.onChange({
        type: 'update',
        path: absolutePath,
      });
    }
  });

  return watcher;
}
