/**
 * A route handler for the redirect URI of OAuth flows, it sends users back to the page that started the flow.
 */
export function createOAuthHandler(): (req: Request) => Response {
  return (req) => {
    const page = /(?:^|;\s*)fumadocs-openapi-oauth=([^;]+)/.exec(req.headers.get('cookie') ?? '');
    // only allow paths of the same origin
    const target = page && URL.parse(decodeURIComponent(page[1]), 'http://localhost');
    if (!target || target.origin !== 'http://localhost') return new Response(null, { status: 400 });

    return new Response(null, {
      status: 302,
      headers: { Location: target.pathname + new URL(req.url).search },
    });
  };
}
