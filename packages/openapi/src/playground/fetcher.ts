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
  /**
   * This method will not apply the path & search parameters from `options` to given `url`.
   *
   * @param url - The full URL of request.
   */
  fetch: (url: string, options: FetchOptions) => Promise<FetchResult>;
}

export function createBrowserFetcher(
  adapters: Record<string, MediaAdapter>,
): Fetcher {
  return {
    async fetch(url, options) {
      const headers = new Headers();
      if (
        options.bodyMediaType &&
        options.bodyMediaType !== 'multipart/form-data'
      )
        headers.append('Content-Type', options.bodyMediaType);

      for (const key in options.header) {
        const param = options.header[key];

        if (!Array.isArray(param.value)) {
          headers.append(key, param.value);
        } else {
          headers.append(key, param.value.join(','));
        }
      }

      const proxyUrl = options.proxyUrl
        ? new URL(options.proxyUrl, document.baseURI)
        : null;

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

        body = adapter.encode(options as { body: unknown });
      }

      // cookies
      for (const key in options.cookie) {
        const param = options.cookie[key];
        const segs: string[] = [`${key}=${param.value}`];

        if (proxyUrl && proxyUrl.origin !== window.location.origin)
          segs.push(`domain=${proxyUrl.host}`);
        segs.push('path=/', 'max-age=30');

        document.cookie = segs.join('; ');
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
