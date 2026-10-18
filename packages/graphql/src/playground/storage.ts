import { isPlainObject } from '@fumari/stf/lib/utils';

const StorageKey = 'fumadocs-graphql-playground';

export interface StoredState {
  url?: string;
  /**
   * headers by endpoint origin, so headers entered for one endpoint are never sent to another.
   */
  headers?: Record<string, Record<string, string>>;
}

/**
 * the origin used to scope stored headers, `undefined` for invalid URLs.
 *
 * WebSocket URLs share the origin of their HTTP endpoint.
 */
export function getEndpointOrigin(url: string): string | undefined {
  if (url.length === 0) return undefined;

  try {
    return new URL(url, window.location.origin).origin.replace(/^ws(s?):/, 'http$1:');
  } catch {
    return undefined;
  }
}

/**
 * parse & validate the persisted state, unknown shapes are dropped.
 */
export function parseStoredState(raw: string | null): StoredState {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};

    const { url, headers } = parsed;
    const out: StoredState = {};
    if (typeof url === 'string') out.url = url;
    if (!isPlainObject(headers)) return out;

    // `JSON.parse()` defines `__proto__` keys as own properties, invalid entries are deleted in place
    for (const origin of Object.keys(headers)) {
      const scoped = headers[origin];
      if (!isPlainObject(scoped)) {
        delete headers[origin];
        continue;
      }

      for (const name of Object.keys(scoped)) {
        if (typeof scoped[name] !== 'string') delete scoped[name];
      }
    }

    out.headers = headers as StoredState['headers'];
    return out;
  } catch {
    return {};
  }
}

export function readStored(): StoredState {
  try {
    return parseStoredState(localStorage.getItem(StorageKey));
  } catch {
    return {};
  }
}

export function writeStored(state: StoredState): void {
  try {
    localStorage.setItem(StorageKey, JSON.stringify(state));
  } catch {
    // ignore (e.g. storage disabled)
  }
}
