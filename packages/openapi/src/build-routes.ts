import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { type MethodInformation, type RouteInformation } from '@/types';
import { createMethod } from '@/schema/method';

export const methodKeys = [
  'get',
  'post',
  'patch',
  'delete',
  'head',
  'put',
] as const;

/**
 * Build the route information of tags, use `.get('all')` to get all entries
 */
export function buildRoutes(
  document: OpenAPI.Document,
): Map<string, RouteInformation[]> {
  const map = new Map<string, RouteInformation[]>();

  for (const [path, value] of Object.entries(document.paths)) {
    if (!value) continue;
    const methodMap = new Map<string, MethodInformation[]>();

    for (const methodKey of methodKeys) {
      const operation = value[methodKey];
      if (!operation) continue;

      const info = createMethod(methodKey, operation);
      const tags = operation.tags ?? [];

      for (const tag of [...tags, 'all']) {
        const list = methodMap.get(tag) ?? [];
        list.push(info);
        methodMap.set(tag, list);
      }
    }

    for (const [tag, methods] of methodMap.entries()) {
      const list = map.get(tag) ?? [];
      list.push({
        ...value,
        path,
        methods,
      });

      map.set(tag, list);
    }
  }

  return map;
}
