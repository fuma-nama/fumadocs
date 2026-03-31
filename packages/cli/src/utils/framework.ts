import type { Framework } from '@/config';

/**
 * Resolves the route file path (relative to the CLI `baseDir`) from an App Router–style route string.
 *
 * @param route - The route path, e.g., "api/auth/[[...slug]]".
 * @param framework - Value of `framework` in CLI config.
 * @param extension - Optional file extension, default is "ts".
 * @returns Relative path incl. framework route root, e.g. "app/api/foo/route.ts" (next), "routes/api.foo.$.ts" (tanstack-start), or "routes/api/foo/$.ts" (react-router).
 */
export function resolveRouteFilePath(
  route: string,
  framework: Framework,
  extension: string = 'ts',
): string {
  route = route.replace(/^\/+/, '').replace(/\/+$/, '');

  switch (framework) {
    case 'next': {
      return `app/${route}/route.${extension}`;
    }
    case 'tanstack-start': {
      let flat = route
        .replace(/\[\[\.\.\.[^/\]]+\]\]/g, '$')
        .replace(/\[\.\.\.[^/\]]+\]/g, '$')
        .replace(/\[([^/\]]+)\]/g, (_, p1) => `$${p1}`);
      flat = flat.replaceAll('/', '.');
      if (flat.startsWith('.')) flat = flat.slice(1);
      return `routes/${flat}.${extension}`;
    }
    case 'react-router': {
      const rrPath = route
        .split('/')
        .map((seg) => {
          if (/^\[\[\.\.\.[^/\]]+\]\]$/.test(seg) || /^\[\.\.\.[^/\]]+\]$/.test(seg)) return '$';
          return seg.replace(/^\[([^/\]]+)\]$/, (_, v) => `$${v}`);
        })
        .join('/');
      return `routes/${rrPath}.${extension}`;
    }
    case 'waku': {
      const underApi = route
        .replace(/\[\[\.\.\.([^\]]+)\]\]/g, '[...$1]')
        .replace(/\[\.\.\.([^\]]+)\]/g, '[...$1]');
      return `pages/_api/${underApi}.${extension}`;
    }
    default: {
      const _exhaustive: never = framework;
      return _exhaustive;
    }
  }
}
