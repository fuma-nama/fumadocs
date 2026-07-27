import Negotiator from 'negotiator';
import { compile, match } from 'path-to-regexp';

export function getNegotiator(request: Request) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return new Negotiator({ headers });
}

/**
 * Rewrite incoming path matching the `source` pattern into the `destination` pattern.
 *
 * See [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) for accepted pattern formats.
 *
 * @param source - the original pattern of incoming paths
 * @param destination - the target pattern to convert into
 */
export function rewritePath(source: string, destination: string) {
  const matcher = match(source, { decode: false });
  const compiler = compile(destination, { encode: false });

  return {
    rewrite(pathname: string) {
      const result = matcher(pathname);
      if (!result) return false;

      return compiler(result.params);
    },
  };
}

interface AcceptEntry {
  mediaType: string;
  quality: number;
}

/**
 * Parse an `Accept` header into its media types and quality values.
 *
 * Media types the client didn't rank explicitly default to `q=1`.
 */
function parseAccept(header: string): AcceptEntry[] {
  const entries: AcceptEntry[] = [];

  for (const section of header.split(',')) {
    const [rawMediaType, ...params] = section.split(';');
    const mediaType = rawMediaType.trim().toLowerCase();
    if (mediaType.length === 0) continue;

    let quality = 1;
    for (const param of params) {
      const separator = param.indexOf('=');
      if (separator === -1 || param.slice(0, separator).trim().toLowerCase() !== 'q') continue;

      const parsed = Number.parseFloat(param.slice(separator + 1));
      if (!Number.isNaN(parsed)) quality = parsed;
    }

    entries.push({ mediaType, quality });
  }

  return entries;
}

export function isMarkdownPreferred(
  request: Request,
  options?: {
    markdownMediaTypes?: string[];
  },
) {
  const { markdownMediaTypes = ['text/plain', 'text/markdown', 'text/x-markdown'] } = options ?? {};

  const accept = request.headers.get('accept');
  if (!accept) return false;

  let markdown = 0;
  let html = 0;

  for (const { mediaType, quality } of parseAccept(accept)) {
    if (quality <= 0) continue;

    if (markdownMediaTypes.includes(mediaType)) {
      markdown = Math.max(markdown, quality);
    } else if (mediaType === 'text/html' || mediaType === 'text/*' || mediaType === '*/*') {
      // a wildcard only says the client will accept Markdown, never that it wants it,
      // so it counts towards HTML — `Accept: */*` (curl, most bots) still gets HTML.
      html = Math.max(html, quality);
    }
  }

  // a tie means the client named a Markdown type without ranking HTML above it, so
  // `text/html, text/markdown` prefers Markdown while `text/html, text/markdown;q=0.1` doesn't.
  return markdown > 0 && markdown >= html;
}
