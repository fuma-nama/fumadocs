import * as url from './url.js';
import type { ParserOptions } from '../options.js';
import type { JSONSchema } from '../types/index.js';
import type $Refs from '../refs.js';

export function getSchemaBasePath(basePath: string, value: unknown) {
  const schemaId = getSchemaId(value);
  return schemaId ? url.resolve(basePath, schemaId) : basePath;
}

export function usesDynamicIdScope(value: unknown) {
  if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) {
    return false;
  }

  const schema = (value as { $schema?: unknown }).$schema;
  if (
    typeof schema === 'string' &&
    (schema.includes('draft/2019-09/') ||
      schema.includes('draft/2020-12/') ||
      schema.includes('oas/3.1/'))
  ) {
    return true;
  }

  const openapi = (value as { openapi?: unknown }).openapi;
  return typeof openapi === 'string' && /^3\.1(?:\.|$)/.test(openapi);
}

export function registerSchemaResources<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(
  $refs: $Refs<S, O>,
  basePath: string,
  value: unknown,
  pathType?: string | unknown,
  dynamicIdScope = false,
) {
  if (!dynamicIdScope) {
    return;
  }

  const seen = new Set<object>();

  const visit = (node: unknown, scopeBase: string) => {
    if (!node || typeof node !== 'object' || ArrayBuffer.isView(node) || seen.has(node)) {
      return;
    }

    seen.add(node);

    const nextScopeBase = getSchemaBasePath(scopeBase, node);
    if (nextScopeBase !== scopeBase) {
      $refs._addAlias(nextScopeBase, node as S, pathType, dynamicIdScope);
    }

    for (const key of Object.keys(node)) {
      visit((node as Record<string, unknown>)[key], nextScopeBase);
    }
  };

  visit(value, basePath);
}

function getSchemaId(value: unknown): string | undefined {
  if (
    value &&
    typeof value === 'object' &&
    '$id' in value &&
    typeof (value as { $id?: unknown }).$id === 'string' &&
    (value as { $id: string }).$id.length > 0
  ) {
    return (value as { $id: string }).$id;
  }

  return undefined;
}
