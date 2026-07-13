import type { ServerObject } from '@/types';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';

export function getDefaultValues(server: ServerObject): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    const variable = dereferenceShallow(v);
    if (variable.default) out[k] = variable.default;
  }

  return out;
}

export function resolveServerUrl(server: ServerObject, variables: Record<string, string>): string {
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
