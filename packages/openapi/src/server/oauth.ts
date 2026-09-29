/**
 * A route handler for the redirect URI of OAuth flows, it sends users back to the page that started the flow.
 */
export function createOAuthHandler(): (req: Request) => Response {
  return (req) => {
    const url = new URL(req.url);
    const page = /(?:^|;\s*)fumadocs-openapi-oauth=([^;]+)/.exec(req.headers.get('cookie') ?? '');
    const target = new URL(decodeURIComponent(page?.[1] ?? '/'), url);
    if (target.origin !== url.origin) return new Response(null, { status: 400 });

    target.search = url.search;
    return Response.redirect(target, 302);
  };
}
