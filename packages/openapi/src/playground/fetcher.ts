import { getPathnameFromInput } from '@/utils/get-pathname-from-input';
import type { RequestData } from '@/requests/_shared';
import type { MediaAdapter } from '@/media/adapter';

export interface FetchOptions extends RequestData {
  proxyUrl?: string;
}

export interface FetchResult {
  status: number;
  type: 'json' | 'html' | 'text';
  data: unknown;
}

export interface Fetcher {
  fetch: (route: string, options: FetchOptions) => Promise<FetchResult>;
}

export function createBrowserFetcher(
  adapters: Record<string, MediaAdapter>,
): Fetcher {
  return {
    async fetch(route, options) {
      const headers = new Headers();
      if (options.bodyMediaType)
        headers.append('Content-Type', options.bodyMediaType);

      for (const key in options.header) {
        const paramValue = options.header[key];

        if (paramValue.length > 0) headers.append(key, paramValue.toString());
      }

      const proxyUrl = options.proxyUrl
        ? new URL(options.proxyUrl, window.location.origin)
        : null;

      let url = getPathnameFromInput(route, options.path, options.query);

      if (proxyUrl) {
        proxyUrl.searchParams.append('url', url);
        url = proxyUrl.toString();
      }

      let body: BodyInit | undefined = undefined;
      if (options.bodyMediaType && options.body) {
        const adapter = adapters[options.bodyMediaType];
        if (!adapter)
          return {
            status: 400,
            type: 'text',
            data: `[Fumadocs] No adapter for ${options.bodyMediaType}, you need to specify one from 'createOpenAPI()'.`,
          };

        body = await adapter.encode(options);
      }

      // cookies
      for (const key in options.cookie) {
        const value = options.cookie[key];
        if (!value) continue;

        const cookie = {
          [key]: value,
          domain:
            proxyUrl && proxyUrl.origin !== window.location.origin
              ? `domain=${proxyUrl.host}`
              : undefined,
          path: '/',
          'max-age': 30,
        };

        let str = '';
        for (const [key, value] of Object.entries(cookie)) {
          if (value) {
            if (str.length > 0) str += '; ';

            str += `${key}=${value}`;
          }
        }

        document.cookie = str;
      }

      return fetch(url, {
        method: options.method,
        cache: 'no-cache',
        headers,
        body,
        signal: AbortSignal.timeout(10 * 1000),
      })
        .then(async (res) => {
          const contentType = res.headers.get('Content-Type') ?? '';
          let type: FetchResult['type'];
          let data: unknown;

          if (contentType.startsWith('application/json')) {
            type = 'json';
            data = await res.json();
          } else {
            type = contentType.startsWith('text/html') ? 'html' : 'text';
            data = await res.text();
          }

          return { status: res.status, type, data };
        })
        .catch((e) => {
          const message =
            e instanceof Error ? `[${e.name}] ${e.message}` : e.toString();

          return {
            status: 400,
            type: 'text',
            data: `Client side error: ${message}`,
          };
        });
    },
  };
}
