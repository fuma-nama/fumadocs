// only this origin can set the page, `sessionStorage` is not shared with subdomains
const script = `const page = sessionStorage.getItem('fumadocs-openapi-oauth');
if (page) location.replace(location.origin + page + location.search + location.hash);`;

export interface OAuthHandlerOptions {
  /**
   * Put the script in the page, the response no longer depends on the request and can be prerendered for static sites.
   *
   * Content Security Policies must allow the inline script.
   */
  inline?: boolean;
}

/**
 * A route handler for the redirect URI of OAuth flows, it sends users back to the page that started the flow.
 */
export function createOAuthHandler({ inline = false }: OAuthHandlerOptions = {}): (
  req: Request,
) => Response {
  // keep the authorization code in the URL out of referrers, the meta tag for static hosts without the header
  const html = `<meta name="referrer" content="no-referrer">${
    // a script file otherwise, Content Security Policies may block inline scripts
    inline ? `<script>${script}</script>` : '<script src="?script"></script>'
  }`;

  return (req) =>
    !inline && new URL(req.url).searchParams.has('script')
      ? new Response(script, { headers: { 'Content-Type': 'text/javascript' } })
      : new Response(html, {
          headers: { 'Content-Type': 'text/html', 'Referrer-Policy': 'no-referrer' },
        });
}
