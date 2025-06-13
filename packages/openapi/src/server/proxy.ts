import type { NextRequest } from 'next/server';

const keys = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

type Proxy = {
  [K in (typeof keys)[number]]: (req: NextRequest) => Promise<Response>;
};

interface CreateProxyOptions {
  /**
   * Filter by prefixes of request url
   *
   * @deprecated Use `allowedOrigins` for filtering origins, or `filterRequest` for more detailed rules.
   */
  allowedUrls?: string[];

  /**
   * List of allowed origins to proxy to.
   */
  allowedOrigins?: string[];

  /**
   * Determine if the proxied request is allowed.
   *
   * @returns true if allowed, otherwise forbidden.
   */
  filterRequest?: (request: Request) => boolean;

  /**
   * Override proxied request/response with yours
   */
  overrides?: {
    request?: (request: Request) => Request;
    response?: (response: Response) => Response;
  };
}

export function createProxy(options: CreateProxyOptions = {}): Proxy {
  const {
    allowedOrigins,
    allowedUrls,
    filterRequest = (req) => {
      return (
        !allowedUrls || allowedUrls.some((item) => req.url.startsWith(item))
      );
    },
    overrides,
  } = options;
  const handlers: Partial<Proxy> = {};

  async function handler(req: NextRequest): Promise<Response> {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
      return Response.json(
        '[Proxy] A `url` query parameter is required for proxy url',
        {
          status: 400,
        },
      );
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return Response.json('[Proxy] Invalid `url` parameter value.', {
        status: 400,
      });
    }

    if (allowedOrigins && !allowedOrigins.includes(parsedUrl.origin)) {
      return Response.json(
        `[Proxy] The origin "${parsedUrl.origin}" is not allowed.`,
        {
          status: 400,
        },
      );
    }

    let proxied = new Request(parsedUrl, {
      method: req.method,
      cache: 'no-cache',
      headers: req.headers,
      body: await req.arrayBuffer(),
    });

    if (overrides?.request) {
      proxied = overrides.request(proxied);
    }

    if (!filterRequest(proxied)) {
      return Response.json('[Proxy] The proxied request is not allowed', {
        status: 403,
      });
    }

    proxied.headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();

      if (key === 'origin') {
        proxied.headers.delete(originalKey);
      }
    });

    let res = await fetch(proxied).catch((e) => new Error(e.toString()));
    if (res instanceof Error) {
      return Response.json(`[Proxy] Failed to proxy request: ${res.message}`, {
        status: 500,
      });
    }

    if (overrides?.response) {
      res = overrides.response(res);
    }

    const headers = new Headers(res.headers);
    headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();
      if (key.startsWith('access-control-') || key === 'content-encoding') {
        headers.delete(originalKey);
      }
    });
    headers.set('X-Forwarded-Host', res.url);

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  }

  for (const key of keys) {
    handlers[key] = handler;
  }

  return handlers as Proxy;
}
