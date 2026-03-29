import type { RequestData } from '@/requests/types';
import type { MediaAdapter } from '@/requests/media/adapter';
import { resolveMediaAdapter } from '@/requests/media/adapter';
import type { Awaitable } from '@/types';

export interface FetchResult {
  status: number;
  type: 'json' | 'html' | 'text';
  data: unknown;
}

export interface Fetcher {
  /**
   * This method will not apply the path & search parameters from `options` to given `url`.
   *
   * @param url - The full URL of request.
   */
  fetch: (url: string, data: RequestData) => Promise<FetchResult>;
}

export interface BrowserFetcherOptions {
  /**
   * Request timeout in seconds (default: 10s)
   */
  requestTimeout?: number | false;

  proxyUrl?: string;
  /**
   * Forward cookies via search parameters when API proxy is configured.
   *
   * @default true
   */
  proxyForwardCookie?: boolean;

  /**
   * transform the request options before sending.
   */
  onRequestInit?: (requestInit: RequestInit) => Awaitable<RequestInit>;
}

export function createBrowserFetcher(
  adapters: Record<string, MediaAdapter>,
  {
    proxyUrl,
    proxyForwardCookie = true,
    requestTimeout = 10,
    onRequestInit,
  }: BrowserFetcherOptions = {},
): Fetcher {
  return {
    async fetch(url, data) {
      let requestUrl = new URL(url, document.baseURI);
      let requestInit: RequestInit = {
        method: data.method,
        cache: 'no-cache',
        signal:
          typeof requestTimeout === 'number'
            ? AbortSignal.timeout(requestTimeout * 1000)
            : undefined,
      };

      const headers = (requestInit.headers = new Headers());

      for (const key in data.header) {
        const param = data.header[key];
        headers.append(key, param.value);
      }

      if (proxyUrl) {
        requestUrl = new URL(proxyUrl, document.baseURI);
        requestUrl.searchParams.append('url', url);
      }

      if (data.bodyMediaType && data.body) {
        const adapter = resolveMediaAdapter(data.bodyMediaType, adapters);
        if (!adapter)
          return {
            status: 400,
            type: 'text',
            data: `[Fumadocs] No adapter for ${data.bodyMediaType}, you need to specify one from 'createOpenAPI()'.`,
          };

        if (data.bodyMediaType !== 'multipart/form-data') {
          headers.append('Content-Type', data.bodyMediaType);
        }

        requestInit.body = adapter.encode(data as { body: unknown });
      }

      // cookies
      if (proxyUrl && proxyForwardCookie) {
        const encoded = Object.entries(data.cookie)
          .map(([k, v]) => `${k}=${encodeURIComponent(v.value)}`)
          .join('; ');
        requestUrl.searchParams.set('cookie', encoded);
        requestInit.credentials = 'omit';
      } else {
        for (const key in data.cookie) {
          const param = data.cookie[key];
          const segs: string[] = [`${key}=${encodeURIComponent(param.value)}`];

          if (proxyUrl && requestUrl.origin !== window.location.origin)
            segs.push(`domain=${requestUrl.host}`);
          segs.push('path=/', 'max-age=30');

          document.cookie = segs.join('; ');
        }
      }

      if (onRequestInit) requestInit = await onRequestInit(requestInit);

      return fetch(requestUrl, requestInit)
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
          const message = e instanceof Error ? `[${e.name}] ${e.message}` : e.toString();

          return {
            status: 400,
            type: 'text',
            data: `Client side error: ${message}`,
          };
        });
    },
  };
}
