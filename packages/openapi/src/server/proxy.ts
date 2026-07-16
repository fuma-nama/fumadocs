const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;
const methodsWithBody = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// https://fetch.spec.whatwg.org/#redirect-status
const redirectStatus = new Set([301, 302, 303, 307, 308]);
const maxRedirects = 20;

class ProxyError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

type Handler = (req: Request) => Promise<Response>;
type OriginMatcher = string | RegExp;

function matchOrigin(origin: string, matcher: OriginMatcher): boolean {
  if (typeof matcher === 'string') return matcher === origin;
  // reset `lastIndex` so a `g`/`y` flagged regex doesn't yield stateful,
  // order-dependent results across calls.
  matcher.lastIndex = 0;
  return matcher.test(origin);
}

export interface Proxy extends Record<(typeof methods)[number], Handler> {
  handle: Handler;
}

export interface CreateProxyOptions {
  /**
   * List of allowed origins to proxy to, also enforced on redirects.
   *
   * @defaultValue the proxy route's own origin (i.e. same-origin only). This
   * prevents the proxy from being abused as an open proxy (SSRF) when no
   * allowlist is configured; a warning is logged in that case.
   */
  allowedOrigins?: OriginMatcher[];

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
  const { allowedOrigins, filterRequest, overrides } = options;
  const handlers: Partial<Proxy> = {
    handle: handler,
  };

  if (!allowedOrigins && !filterRequest) {
    console.warn(
      "[Proxy] `createProxy()` was called without `allowedOrigins` or `filterRequest`. Requests will be restricted to the proxy route's own origin. Set `allowedOrigins` to allow proxying to your API endpoints.",
    );
  }

  async function handler(req: Request): Promise<Response> {
    const reqUrl = new URL(req.url);
    const searchParams = reqUrl.searchParams;
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

    const allowed = allowedOrigins ?? [reqUrl.origin];

    if (allowed.every((matcher) => !matchOrigin(targetUrl.origin, matcher))) {
      return Response.json(`[Proxy] The origin "${targetUrl.origin}" is not allowed.`, {
        status: 400,
      });
    }

    const proxied = await rewriteRequest(req, targetUrl, searchParams.get('cookie'));

    if (filterRequest && !filterRequest(proxied)) {
      return Response.json('[Proxy] The proxied request is not allowed', {
        status: 403,
      });
    }

    try {
      return rewriteResponse(await proxyFetch(proxied, allowed));
    } catch (err) {
      if (err instanceof ProxyError) {
        return Response.json(`[Proxy] ${err.message}`, { status: err.status });
      }

      return Response.json(
        `[Proxy] Failed to proxy request: ${err instanceof Error ? err.message : 'unknown reason'}`,
        {
          status: 500,
        },
      );
    }
  }

  async function proxyFetch(initial: Request, allowed: OriginMatcher[]): Promise<Response> {
    let method = initial.method;
    let url = initial.url;
    const headers = new Headers(initial.headers);
    let body: ArrayBuffer | undefined =
      initial.body && methodsWithBody.has(method.toUpperCase())
        ? await initial.arrayBuffer()
        : undefined;

    for (let redirects = 0; redirects <= maxRedirects; redirects++) {
      const response = await fetch(
        new Request(url, { method, headers, body, cache: 'no-cache', redirect: 'manual' }),
      );

      const location = response.headers.get('location');
      if (!redirectStatus.has(response.status) || !location) return response;

      const next = new URL(location, url);
      if (allowed.every((matcher) => !matchOrigin(next.origin, matcher))) {
        throw new ProxyError(`The redirect origin "${next.origin}" is not allowed.`);
      }

      // Match browser semantics: 303 (and 301/302 for non-idempotent methods)
      // turn the follow-up request into a bodyless GET.
      switch (response.status) {
        case 301:
        case 302:
          if (method === 'GET' || method === 'HEAD') break;
        case 303:
          method = 'GET';
          body = undefined;
          headers.delete('content-length');
          headers.delete('content-type');
          break;
      }

      url = next.href;
    }

    throw new ProxyError('Too many redirects.', 508);
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
