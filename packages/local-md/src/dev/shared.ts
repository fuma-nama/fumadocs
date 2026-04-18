export const LOCAL_MD_DEV_PATH = '/_fumadocs_local_md';

export type DevWatchEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';

export interface DevClientEvent {
  type: 'watch';
  absolutePath: string;
}

export type DevServerEvent =
  | {
      type: 'connected';
      timestamp: number;
    }
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

const publicEnvNames = [
  'FD_LOCAL_MD_DEV_SERVER_URL',
  'NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL',
  'VITE_FD_LOCAL_MD_DEV_SERVER_URL',
];

export function getDevServerUrlFromEnv(): string | undefined {
  // must hardcode to allow bundlers to inline env variables
  if (typeof process === 'object' && 'env' in process) {
    return (
      process.env.FD_LOCAL_MD_DEV_SERVER_URL ??
      process.env.NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL ??
      process.env.VITE_FD_LOCAL_MD_DEV_SERVER_URL
    );
  }

  if (import.meta.env) {
    return (
      import.meta.env.FD_LOCAL_MD_DEV_SERVER_URL ??
      import.meta.env.NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL ??
      import.meta.env.VITE_FD_LOCAL_MD_DEV_SERVER_URL
    );
  }
}

export function setDevServerUrlInEnv(url: string) {
  for (const name of publicEnvNames) {
    process.env[name] = url;
  }
}
