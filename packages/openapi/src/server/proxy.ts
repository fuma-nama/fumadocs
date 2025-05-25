import type { NextRequest } from 'next/server';

const keys = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

type Proxy = {
  [K in (typeof keys)[number]]: (req: NextRequest) => Promise<Response>;
};

type CreateProxyOptions = {
  allowedUrls?: string[];
  overrides?: {
    request?: RequestInit,
    response?: ResponseInit;
  }
}

export function createProxy({ allowedUrls, overrides = {} }: CreateProxyOptions = {}): Proxy {
  const handlers: Partial<Proxy> = {};

  async function handler(req: NextRequest): Promise<Response> {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
      return Response.json(
        'A `url` query parameter is required for proxy url',
        {
          status: 400,
        },
      );
    }

    if (
      allowedUrls &&
      allowedUrls.every((allowedUrl) => !allowedUrl.startsWith(url))
    ) {
      return Response.json('The given `url` query parameter is not allowed', {
        status: 400,
      });
    }

    const clonedReq = new Request(url, {
      ...req,
      ...overrides.request,
      cache: 'no-cache',
      mode: 'cors',
    });
    clonedReq.headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();
      const notAllowed = key === 'origin';

      if (notAllowed) {
        clonedReq.headers.delete(originalKey);
      }
    });

    const res = await fetch(clonedReq).catch((e) => new Error(e.toString()));
    if (res instanceof Error) {
      return Response.json(`Failed to proxy request: ${res.message}`, {
        status: 400,
      });
    }

    const headers = new Headers(res.headers);
    if (overrides.response.headers) {
      const overrideHeaders = new Headers(overrides.response.headers);
      overrideHeaders.forEach((value, key) => headers.set(key, value));
    }

    headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();
      const notAllowed =
        key.startsWith('access-control-') || key === 'content-encoding';

      if (notAllowed) {
        headers.delete(originalKey);
      }
    });
    headers.set('X-Forwarded-Host', res.url);

    return new Response(res.body, {
      ...res,
      ...overrides.response,
      headers,
    });
  }

  for (const key of keys) {
    handlers[key] = handler;
  }

  return handlers as Proxy;
}
