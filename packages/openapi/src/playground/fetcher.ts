import { safeParse } from 'fast-content-type-parse';
import type { RequestData } from '@/requests/types';
import type { MediaAdapter } from '@/requests/media/adapter';
import { resolveMediaAdapter } from '@/requests/media/resolve-adapter';
import type { Awaitable } from '@/types';

export type FetchResult = FetchResponseResult | FetchErrorResult;

export interface FetchErrorResult {
  type: 'client_error';
  url: string;
  message: string;
}

export interface FetchResponseResult {
  type: 'response';
  url: string;
  status: number;
  headers: Headers;
  body: ArrayBuffer;
  /** how long the request took, in milliseconds */
  duration: number;
  /** the media type of `Content-Type` like `application/json` */
  mediaType?: string;
  /** the file name from `Content-Disposition`, without directories */
  fileName?: string;
  /** decode the body with the charset of `Content-Type`, UTF-8 by default */
  text: () => string;
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
        // fetch only normalizes the case of some methods
        method: data.method.toUpperCase(),
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
            type: 'client_error',
            url,
            message: `[Fumadocs] No media adapter for ${data.bodyMediaType}, pass one to \`mediaAdapters\` of \`createOpenAPIPage()\`.`,
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

      const start = performance.now();
      return fetch(requestUrl, requestInit)
        .then(async (res): Promise<FetchResult> => {
          const body = await res.arrayBuffer();
          const { type, parameters } = safeParse(res.headers.get('Content-Type') ?? '');

          return {
            type: 'response',
            url: res.url,
            status: res.status,
            headers: res.headers,
            body,
            duration: performance.now() - start,
            mediaType: type || undefined,
            fileName: getFileName(res.headers),
            text() {
              try {
                if (parameters.charset) return new TextDecoder(parameters.charset).decode(body);
              } catch {}
              return new TextDecoder().decode(body);
            },
          };
        })
        .catch((e): FetchResult => {
          const message = e instanceof Error ? `[${e.name}] ${e.message}` : e.toString();

          return {
            type: 'client_error',
            url,
            message: `Client side error: ${message}`,
          };
        });
    },
  };
}

/** prefers `filename*` (RFC 6266) */
function getFileName(headers: Headers): string | undefined {
  const disposition = headers.get('Content-Disposition');
  if (!disposition) return;
  const extended = /(?:^|;)\s*filename\*\s*=\s*[^']*'[^']*'([^\s;"]+)/i.exec(disposition);
  let name: string | undefined;

  if (extended) {
    try {
      name = decodeURIComponent(extended[1]);
    } catch {}
  }

  if (!name) {
    const match = /(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^\s;]+))/i.exec(disposition);
    name = match?.[1]?.replace(/\\(.)/g, '$1') ?? match?.[2];
  }

  return name?.replace(/^.*[/\\]/, '') || undefined;
}
