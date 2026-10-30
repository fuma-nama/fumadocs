// only this origin can set the page, `sessionStorage` is not shared with subdomains
const script = `const page = sessionStorage.getItem('fumadocs-openapi-oauth');
if (page) location.replace(location.origin + page + location.search + location.hash);`;

/**
 * A route handler for the redirect URI of OAuth flows, it sends users back to the page that started the flow.
 */
export function createOAuthHandler(): (req: Request) => Response {
  return (req) =>
    // a script file, Content Security Policies may block inline scripts
    new URL(req.url).searchParams.has('script')
      ? new Response(script, { headers: { 'Content-Type': 'text/javascript' } })
      : new Response('<script src="?script"></script>', {
          // keep the authorization code in the URL out of referrers
          headers: { 'Content-Type': 'text/html', 'Referrer-Policy': 'no-referrer' },
        });
}
