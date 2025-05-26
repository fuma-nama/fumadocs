import type { NextRequest } from 'next/server';

const keys = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

type Proxy = {
  [K in (typeof keys)[number]]: (req: NextRequest) => Promise<Response>;
};

interface CreateProxyOptions {
  allowedUrls?: string[];

  /**
   * Override original request/response with yours
   */
  overrides?: {
    request?: (request: Request) => Request;
    response?: (response: Response) => Response;
  };
}

export function createProxy(options: CreateProxyOptions = {}): Proxy {
  const { allowedUrls, overrides } = options;
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

    let clonedReq = new Request(url, {
      ...req,
      cache: 'no-cache',
      mode: 'cors',
    });

    if (overrides?.request) {
      clonedReq = overrides.request(clonedReq);
    }

    clonedReq.headers.forEach((_value, originalKey) => {
      const key = originalKey.toLowerCase();
      const notAllowed = key === 'origin';

      if (notAllowed) {
        clonedReq.headers.delete(originalKey);
      }
    });

    let res = await fetch(clonedReq).catch((e) => new Error(e.toString()));
    if (res instanceof Error) {
      return Response.json(`Failed to proxy request: ${res.message}`, {
        status: 400,
      });
    }

    if (overrides?.response) {
      res = overrides.response(res);
    }

    const headers = new Headers(res.headers);
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
      headers,
    });
  }

  for (const key of keys) {
    handlers[key] = handler;
  }

  return handlers as Proxy;
}
