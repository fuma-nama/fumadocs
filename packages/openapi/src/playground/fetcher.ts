import { getPathnameFromInput } from '@/utils/get-pathname-from-input';
import { js2xml } from 'xml-js';
import { RequestData } from '@/requests/_shared';

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

export function createBrowserFetcher(): Fetcher {
  return {
    async fetch(route, options) {
      const headers = new Headers();
      if (
        options.bodyMediaType &&
        options.bodyMediaType !== 'multipart/form-data'
      )
        headers.append('Content-Type', options.bodyMediaType);

      for (const key in options.header) {
        const paramValue = options.header[key];

        if (paramValue.length > 0) headers.append(key, paramValue.toString());
      }

      const proxyUrl = options.proxyUrl
        ? new URL(options.proxyUrl, window.location.origin)
        : null;

      if (typeof document !== 'undefined') {
        for (const key in options.cookie) {
          const value = options.cookie[key];
          if (!value) continue;

          document.cookie = [
            `${key}=${value}`,
            'HttpOnly',
            proxyUrl && proxyUrl.origin !== window.location.origin
              ? `domain=${proxyUrl.host}`
              : false,
            'path=/',
          ]
            .filter(Boolean)
            .join(';');
        }
      }

      let url = getPathnameFromInput(route, options.path, options.query);

      if (proxyUrl) {
        proxyUrl.searchParams.append('url', url);
        url = proxyUrl.toString();
      }

      return fetch(url, {
        method: options.method,
        cache: 'no-cache',
        headers,
        body:
          options.bodyMediaType && options.body
            ? await createBodyFromValue(options.bodyMediaType, options.body)
            : undefined,
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

/**
 * Create request body from value
 */
export async function createBodyFromValue(
  mediaType: Required<RequestData>['bodyMediaType'],
  value: unknown,
): Promise<BodyInit> {
  if (mediaType === 'application/json') {
    return JSON.stringify(value);
  }

  if (mediaType === 'application/xml') {
    return js2xml(value as Record<string, unknown>, {
      compact: true,
      spaces: 2,
    });
  }

  if (mediaType === 'application/x-www-form-urlencoded') {
    if (typeof value !== 'object')
      throw new Error(`Input value must be object, received: ${typeof value}`);

    const params = new URLSearchParams();
    for (const key in value) {
      params.set(key, String(value[key as keyof object]));
    }
    return params;
  }

  const formData = new FormData();

  if (typeof value !== 'object' || !value) {
    throw new Error(`Unsupported body type: ${typeof value}, expected: object`);
  }

  for (const key in value) {
    const prop: unknown = value[key as keyof object];

    if (typeof prop === 'object' && prop instanceof File) {
      formData.set(key, prop);
    }

    if (Array.isArray(prop) && prop.every((item) => item instanceof File)) {
      for (const item of prop) {
        formData.append(key, item);
      }
    }

    if (prop && !(prop instanceof File)) {
      formData.set(key, JSON.stringify(prop));
    }
  }

  return formData;
}
