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
   * List of allowed origins to proxy to, also enforced on redirects. Listed origins are trusted,
   * including private ones like `http://localhost:8080`.
   *
   * @defaultValue any public HTTP(S) origin. Hosts resolving to private network addresses (e.g.
   * loopback, link-local) are refused when connecting, this requires Node.js or Deno. Cookies of
   * your site and `Set-Cookie` headers of responses are not forwarded.
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

  function isAllowed(url: URL): boolean {
    if (allowedOrigins) return allowedOrigins.some((matcher) => matchOrigin(url.origin, matcher));
    return url.protocol === 'http:' || url.protocol === 'https:';
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

    if (!isAllowed(targetUrl)) {
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
      return await proxyFetch(proxied);
    } catch (e) {
      // `fetch()` wraps connection errors
      const err = e instanceof Error && e.cause instanceof ProxyError ? e.cause : e;
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

  async function proxyFetch(initial: Request): Promise<Response> {
    // `fetch()` can't refuse private networks
    const send: Fetch = allowedOrigins ? fetch : await (publicFetch ??= createPublicFetch());
    let method = initial.method;
    let url = new URL(initial.url);
    const headers = new Headers(initial.headers);
    let body: ArrayBuffer | undefined =
      initial.body && methodsWithBody.has(method.toUpperCase())
        ? await initial.arrayBuffer()
        : undefined;

    for (let redirects = 0; redirects <= maxRedirects; redirects++) {
      const response = await send(url, {
        method,
        headers,
        body,
        cache: 'no-cache',
        redirect: 'manual',
        signal: initial.signal,
      });

      const location = response.headers.get('location');
      if (!redirectStatus.has(response.status) || !location) return rewriteResponse(response, url);
      await response.body?.cancel();

      const next = new URL(location, url);
      if (!isAllowed(next)) {
        throw new ProxyError(`The redirect origin "${next.origin}" is not allowed.`);
      }

      // like `fetch()`, credentials are not sent to other origins
      if (next.origin !== url.origin) {
        headers.delete('authorization');
        headers.delete('proxy-authorization');
        headers.delete('cookie');
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

      url = next;
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
    // cookies of your site, only listed origins are trusted with them
    if (!allowedOrigins) headers.delete('cookie');
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    const proxied = new Request(url, {
      method: request.method,
      cache: 'no-cache',
      headers,
      // a stream, read once by `proxyFetch()`
      body: methodsWithBody.has(request.method.toUpperCase()) ? request.body : null,
      // stops the upstream request when the client disconnects
      signal: request.signal,
      // required for stream bodies, missing in the DOM types
      duplex: 'half',
    } as RequestInit);

    return overrides?.request ? overrides.request(proxied) : proxied;
  }

  async function rewriteResponse(response: Response, url: URL): Promise<Response> {
    if (overrides?.response) {
      response = overrides.response(response);
    }

    // `Response` only accepts 200-599
    if (response.status < 200 || response.status > 599) {
      await response.body?.cancel();
      throw new ProxyError(
        `The upstream responded with an unsupported status ${response.status}.`,
        502,
      );
    }

    const headers = new Headers();
    response.headers.forEach((value, key) => {
      if (key.startsWith('access-control-')) return;
      switch (key) {
        case 'set-cookie':
          if (!allowedOrigins) return;
          break;
        // `fetch()` already decoded the body, so the upstream content-encoding and
        // content-length no longer describe the bytes we forward. Leaving them makes
        // the browser try to decode plain data again (ERR_CONTENT_DECODING_FAILED).
        case 'content-encoding':
        case 'content-length':
        case 'alt-svc':
        case 'clear-site-data':
        case 'nel':
        case 'refresh':
        case 'report-to':
        case 'reporting-endpoints':
        case 'set-login':
        case 'strict-transport-security':
          return;
      }

      headers.append(key, value);
    });

    headers.set('X-Forwarded-Host', url.href);
    // proxied content is served from your origin, it must not run scripts when opened as a page
    headers.append('Content-Security-Policy', 'sandbox');

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

type Fetch = (
  url: URL,
  init: RequestInit & { method: string; headers: Headers; body?: ArrayBuffer },
) => Promise<Response>;

// loopback, private, link-local, CGNAT and reserved ranges (IPv4-mapped IPv6 addresses included),
// plus IPv6 transition ranges (Teredo, 6to4, NAT64) that can embed private IPv4 addresses
const privateRanges: [address: string, prefix: number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  // includes the legacy metadata endpoint of Oracle Cloud
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  // used for pods by some Kubernetes clusters
  ['240.0.0.0', 4],
  ['::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['2001::', 32],
  ['2002::', 16],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
];

let publicFetch: Promise<Fetch> | undefined;

/**
 * `fetch()` refusing hosts on private networks, checked against the resolved addresses of every
 * connection.
 */
async function createPublicFetch(): Promise<Fetch> {
  // Bun replaces `undici` with a stub that ignores `dispatcher`
  if ('Bun' in globalThis)
    throw new ProxyError(
      'Private networks cannot be blocked on Bun, specify `allowedOrigins`.',
      500,
    );

  const [{ Agent, fetch }, dns, { BlockList, isIP }] = await Promise.all([
    import('undici'),
    import('node:dns'),
    import('node:net'),
  ]);
  const ipType = (address: string) => (isIP(address) === 6 ? 'ipv6' : 'ipv4');
  const blockList = new BlockList();
  for (const [address, prefix] of privateRanges) {
    blockList.addSubnet(address, prefix, ipType(address));
  }
  const isPrivate = (address: string) => blockList.check(address, ipType(address));
  // also for DNS errors, so it doesn't reveal which hosts exist in your network
  const refuse = (hostname: string) =>
    new ProxyError(
      `The host "${hostname}" doesn't resolve to a public address, add its origin to \`allowedOrigins\` to proxy to private hosts.`,
    );

  // its own connection pool: reused sockets skip `lookup`
  const dispatcher = new Agent({
    connect: {
      lookup(hostname, options, callback) {
        dns.lookup(hostname, options, (err, address, family) => {
          const addresses = typeof address === 'string' ? [{ address }] : address;
          if (err || addresses.some((item) => isPrivate(item.address))) {
            callback(refuse(hostname), address, family);
          } else {
            callback(null, address, family);
          }
        });
      },
    },
  });

  return async (url, init) => {
    // IP addresses skip `lookup`
    const hostname = url.hostname.replace(/^\[(.*)\]$/, '$1');
    if (isIP(hostname) && isPrivate(hostname)) throw refuse(hostname);
    // undici declares its own `Response` type
    return fetch(url, { ...init, dispatcher }) as unknown as Promise<Response>;
  };
}
