const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;
const methodsWithBody = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type Handler = (req: Request) => Promise<Response>;

export interface Proxy extends Record<(typeof methods)[number], Handler> {
  handle: Handler;
}

export interface CreateProxyOptions {
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
      return !allowedUrls || allowedUrls.some((item) => req.url.startsWith(item));
    },
    overrides,
  } = options;
  const handlers: Partial<Proxy> = {
    handle: handler,
  };

  async function handler(req: Request): Promise<Response> {
    const searchParams = new URL(req.url).searchParams;
    const rawUrl = searchParams.get('url');

    if (!rawUrl)
      return Response.json('[Proxy] A `url` query parameter is required for proxy url', {
        status: 400,
      });

    const targetUrl = URL.parse(rawUrl);
    if (!targetUrl)
      return Response.json('[Proxy] Invalid `url` parameter value.', {
        status: 400,
      });

    if (allowedOrigins && !allowedOrigins.includes(targetUrl.origin)) {
      return Response.json(`[Proxy] The origin "${targetUrl.origin}" is not allowed.`, {
        status: 400,
      });
    }

    const proxied = await rewriteRequest(req, targetUrl, searchParams.get('cookie'));

    if (!filterRequest(proxied)) {
      return Response.json('[Proxy] The proxied request is not allowed', {
        status: 403,
      });
    }

    try {
      return rewriteResponse(await fetch(proxied));
    } catch (err) {
      return Response.json(
        `[Proxy] Failed to proxy request: ${err instanceof Error ? err.message : 'unknown reason'}`,
        {
          status: 500,
        },
      );
    }
  }

  async function rewriteRequest(
    request: Request,
    url: URL,
    cookie: string | null,
  ): Promise<Request> {
    const headers = new Headers(request.headers);
    headers.delete('origin');
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    const contentLength = headers.get('content-length');
    const hasBody = contentLength && parseInt(contentLength) > 0;

    const proxied = new Request(url, {
      method: request.method,
      cache: 'no-cache',
      headers,
      body:
        hasBody && methodsWithBody.has(request.method.toUpperCase())
          ? await request.arrayBuffer()
          : undefined,
    });

    return overrides?.request ? overrides.request(proxied) : proxied;
  }

  async function rewriteResponse(response: Response): Promise<Response> {
    if (overrides?.response) {
      response = overrides.response(response);
    }

    const headers = new Headers(response.headers);
    headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();

      if (key.startsWith('access-control-')) {
        headers.delete(originalKey);
      }
    });
    headers.set('X-Forwarded-Host', response.url);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  for (const key of methods) {
    handlers[key] = handler;
  }

  return handlers as Proxy;
}
