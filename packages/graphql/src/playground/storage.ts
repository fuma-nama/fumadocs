const StorageKey = 'fumadocs-graphql-playground';

export interface HeaderItem {
  key: string;
  value: string;
}

export interface StoredState {
  url?: string;
  /**
   * stored header rows, keyed by endpoint origin so headers entered for one
   * endpoint are never replayed against another.
   */
  headers?: Record<string, HeaderItem[]>;
}

/**
 * the origin used to scope stored headers, `undefined` for invalid URLs.
 */
export function getEndpointOrigin(url: string, base?: string): string | undefined {
  if (url.length === 0) return undefined;

  try {
    return new URL(
      url,
      base ?? (typeof window !== 'undefined' ? window.location.origin : undefined),
    ).origin;
  } catch {
    return undefined;
  }
}

export function filterHeaderItems(items: unknown): HeaderItem[] {
  if (!Array.isArray(items)) return [];

  return items.filter(
    (item): item is HeaderItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as HeaderItem).key === 'string' &&
      typeof (item as HeaderItem).value === 'string',
  );
}

/**
 * parse & validate the persisted state, unknown shapes are dropped.
 *
 * the legacy shape stored a single headers array shared by every endpoint,
 * it is ignored instead of being migrated.
 */
export function parseStoredState(raw: string | null): StoredState {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const { url, headers } = parsed as Record<string, unknown>;
    const out: StoredState = {};
    if (typeof url === 'string') out.url = url;

    if (typeof headers === 'object' && headers !== null && !Array.isArray(headers)) {
      const scoped: Record<string, HeaderItem[]> = {};

      for (const [origin, items] of Object.entries(headers)) {
        if (Array.isArray(items)) scoped[origin] = filterHeaderItems(items);
      }

      out.headers = scoped;
    }

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
