import path from 'node:path';
import { type FSWatcher, watch as watchFn } from 'chokidar';

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
  const watcher = watchFn(files, { cwd });

  watcher.on('all', (eventName, relativePath) => {
    const absolutePath = path.resolve(cwd, relativePath);

    if (eventName === 'add') {
      options.onChange({
        type: 'add',
        path: absolutePath,
      });
    }

    if (eventName === 'unlink') {
      options.onChange({
        type: 'delete',
        path: absolutePath,
      });
    }

    if (eventName === 'change') {
      options.onChange({
        type: 'update',
        path: absolutePath,
      });
    }
  });

  return watcher;
}
