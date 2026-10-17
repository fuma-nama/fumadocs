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
export function getEndpointOrigin(url: string, base?: string): string | undefined {
  if (url.length === 0) return undefined;

  try {
    return new URL(
      url,
      base ?? (typeof window !== 'undefined' ? window.location.origin : undefined),
    ).origin.replace(/^ws(s?):/, 'http$1:');
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * parse & validate the persisted state, unknown shapes are dropped.
 */
export function parseStoredState(raw: string | null): StoredState {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return {};

    const out: StoredState = {};
    if (typeof parsed.url === 'string') out.url = parsed.url;
    if (!isRecord(parsed.headers)) return out;

    const scoped: [string, Record<string, string>][] = [];
    for (const [origin, headers] of Object.entries(parsed.headers)) {
      if (!isRecord(headers)) continue;
      const valid: [string, string][] = [];
      for (const [name, value] of Object.entries(headers)) {
        if (typeof value === 'string') valid.push([name, value]);
      }

      scoped.push([origin, Object.fromEntries(valid)]);
    }

    out.headers = Object.fromEntries(scoped);
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
