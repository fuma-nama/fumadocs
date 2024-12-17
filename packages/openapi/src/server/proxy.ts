import type { NextRequest } from 'next/server';

const keys = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

type Proxy = {
  [K in (typeof keys)[number]]: (req: NextRequest) => Promise<Response>;
};

export function createProxy(allowedUrls?: string[]): Proxy {
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

    const clonedReq = new Request(url, req);
    clonedReq.headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();
      const notAllowed = key === 'origin';

      if (notAllowed) {
        clonedReq.headers.delete(originalKey);
      }
    });

    const res = await fetch(clonedReq, {
      cache: 'no-cache',
    }).catch((e) => new Error(e.toString()));
    if (res instanceof Error) {
      return Response.json(`Failed to proxy request: ${res.message}`, {
        status: 400,
      });
    }

    const headers = new Headers(res.headers);
    headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();
      const notAllowed = key.startsWith('access-control-');

      if (notAllowed) {
        headers.delete(originalKey);
      }
    });
    headers.set('X-Forwarded-Host', res.url);

    return new Response(res.body, {
      ...res,
      headers,
    });
  }

  for (const key of keys) {
    handlers[key] = handler;
  }

  return handlers as Proxy;
}
