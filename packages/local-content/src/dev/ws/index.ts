import path from 'node:path';
import type { WatchableSource } from '../../source';
import { getDevServerUrlFromEnv } from './protocol';

export interface ConnectOptions {
  /** defaults to the URL the dev server puts in the environment */
  url?: string;
  warnWhenMissing?: boolean;
}

/**
 * Watch a source through the standalone dev server.
 *
 * The watcher runs in one process and broadcasts over a websocket, so it works
 * when the framework runs several workers. On Vite, prefer `./vite`.
 */
export async function watchWithDevServer(
  source: WatchableSource,
  { url = getDevServerUrlFromEnv(), warnWhenMissing = true }: ConnectOptions = {},
): Promise<() => void> {
  if (!url) {
    if (warnWhenMissing) {
      console.warn(
        `[@fumadocs/local-content] dev server URL could not be found, try passing \`url\` explicitly instead`,
      );
    }
    return () => undefined;
  }

  const { connectDevServer } = await import('./connection');
  const conn = connectDevServer(url);
  conn.send({
    type: 'watch-dir',
    dir: path.resolve(source.dir),
    includes: source.include,
  });

  return conn.subscribe((event) => {
    if (event.type === 'change') source.invalidateFile(event.absolutePath);
  });
}
