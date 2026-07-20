/**
 * Wire protocol for the content dev server.
 *
 * Kept byte-compatible with `@fumadocs/local-md`'s dev server, so the
 * `local-md` CLI can act as the watcher process for a Sätteri content source.
 */
export const LOCAL_MD_DEV_PATH = '/_fumadocs_local_md';

export type DevWatchEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';

export interface WatchDirOptions {
  dir: string;
  includes: string[];
}

export interface DevClientEvent extends WatchDirOptions {
  type: 'watch-dir';
}

export type DevServerEvent =
  | {
      type: 'change';
      event: DevWatchEvent;
      absolutePath: string;
      timestamp: number;
    }
  | {
      type: 'error';
      message: string;
      timestamp: number;
    };

export function encodeDevClientEvent(event: DevClientEvent): string {
  return JSON.stringify(event);
}

export function decodeDevClientEvent(value: string): DevClientEvent | undefined {
  try {
    return JSON.parse(value) as DevClientEvent;
  } catch {
    return undefined;
  }
}

export function encodeDevEvent(event: DevServerEvent): string {
  return JSON.stringify(event);
}

export function decodeDevEvent(value: string): DevServerEvent | undefined {
  try {
    return JSON.parse(value) as DevServerEvent;
  } catch {
    return undefined;
  }
}

export function getDevServerUrlFromEnv(): string | undefined {
  // must hardcode to allow bundlers to inline env variables
  if (typeof process === 'object' && 'env' in process) {
    return (
      process.env.FD_LOCAL_MD_DEV_SERVER_URL ??
      process.env.NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL ??
      process.env.VITE_FD_LOCAL_MD_DEV_SERVER_URL
    );
  }

  // typed locally rather than augmenting `ImportMeta` globally, which would
  // leak into (and can conflict with) consumers' type environments
  const { env } = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };

  if (env) {
    return (
      env.FD_LOCAL_MD_DEV_SERVER_URL ??
      env.NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL ??
      env.VITE_FD_LOCAL_MD_DEV_SERVER_URL
    );
  }
}
