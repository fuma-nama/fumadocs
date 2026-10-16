import type { ServerObject } from '@/types';
import { dereference } from '@fumadocs/json-schema';

export function getDefaultValues(server: ServerObject): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    const variable = dereference(v);
    if (variable.default !== undefined) out[k] = variable.default;
  }

  return out;
}

/** fill the `{name}` variables of a template, the unknown ones are kept */
export function fillVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (match, name: string) => variables[name] ?? match);
}

function getPathname(server: ServerObject, variables: Record<string, string>): string {
  const pathname = fillVariables(server.pathname ?? '', variables).replace(/\/$/, '');
  return pathname && !pathname.startsWith('/') ? `/${pathname}` : pathname;
}

export function resolveServerUrl(server: ServerObject, variables: Record<string, string>): string {
  return `${server.protocol}://${fillVariables(server.host, variables)}${getPathname(server, variables)}`;
}

/** protocols connecting to a URL, the channel address is a path of it */
const urlProtocols = new Set(['ws', 'wss', 'http', 'https']);

export function isUrlProtocol(protocol: string): boolean {
  return urlProtocols.has(protocol);
}

/** the binding key of a protocol, secure variants share the bindings */
export function getBindingKey(protocol: string): string {
  switch (protocol) {
    case 'wss':
      return 'ws';
    case 'https':
      return 'http';
    case 'kafka-secure':
      return 'kafka';
    case 'mqtts':
    case 'secure-mqtt':
      return 'mqtt';
    case 'amqps':
      return 'amqp';
    case 'stomps':
      return 'stomp';
    default:
      return protocol;
  }
}

/**
 * Split the URL to a channel of URL protocols into the server part and the channel address as its path.
 *
 * The pathname of server isn't repeated when the address already starts with it.
 */
export function getUrlParts(
  server: ServerObject,
  variables: Record<string, string>,
  address: string,
): [server: string, path: string] {
  const origin = `${server.protocol}://${fillVariables(server.host, variables)}`;
  const pathname = getPathname(server, variables);
  const path = address.startsWith('/') ? address : `/${address}`;

  if (path === '/') return [origin + pathname, pathname ? '' : '/'];
  if (!pathname || path === pathname || path.startsWith(`${pathname}/`)) return [origin, path];
  return [origin + pathname, path];
}
