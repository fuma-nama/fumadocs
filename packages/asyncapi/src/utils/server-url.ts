import type { ServerObject } from '@/types';
import type { NoReference } from '@fumadocs/api-docs/schema';

export function getDefaultValues(server: NoReference<ServerObject>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    if (v.default) out[k] = v.default;
  }

  return out;
}

export function resolveServerUrl(
  server: NoReference<ServerObject>,
  variables: Record<string, string>,
): string {
  let host = server.host;
  let pathname = server.pathname ?? '';

  for (const [key, value] of Object.entries(variables)) {
    const token = `{${key}}`;
    host = host.replaceAll(token, value);
    pathname = pathname.replaceAll(token, value);
  }

  if (pathname && !pathname.startsWith('/')) pathname = `/${pathname}`;
  return `${server.protocol}://${host}${pathname}`;
}
