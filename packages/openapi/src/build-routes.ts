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

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!pathItem) continue;
    const methodMap = new Map<string, MethodInformation[]>();

    for (const methodKey of methodKeys) {
      const operation = pathItem[methodKey];
      if (!operation) continue;

      const info = createMethod(methodKey, pathItem, operation);
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
        ...pathItem,
        path,
        methods,
      });

      map.set(tag, list);
    }
  }

  return map;
}
