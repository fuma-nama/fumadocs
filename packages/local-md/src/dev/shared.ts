export const LOCAL_MD_DEV_PATH = '/_fumadocs_local_md';
export const LOCAL_MD_DEV_PORT_ENV = 'FUMADOCS_LOCAL_MD_DEV_SERVER_PORT';

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

export function getDevServerPort(port = process.env[LOCAL_MD_DEV_PORT_ENV]): number | undefined {
  if (!port) return undefined;

  const value = Number.parseInt(port, 10);
  if (!Number.isFinite(value) || value <= 0) return undefined;

  return value;
}

export function getDevServerUrl(port: number, host = '127.0.0.1'): string {
  return `ws://${host}:${port}${LOCAL_MD_DEV_PATH}`;
}
