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

export function isMarkdownPreferred(
  request: Request,
  options?: {
    markdownMediaTypes?: string[];
  },
) {
  const {
    markdownMediaTypes = ['text/plain', 'text/markdown', 'text/x-markdown'],
  } = options ?? {};

  const mediaTypes = getNegotiator(request).mediaTypes();
  return markdownMediaTypes.some((type) => mediaTypes.includes(type));
}
