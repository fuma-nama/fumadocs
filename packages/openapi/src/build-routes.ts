import { type Document } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { OperationItem, WebhookItem } from '@/render/api-page';
import type { OpenAPIV3_1 } from 'openapi-types';

export const methodKeys = [
  'get',
  'post',
  'patch',
  'delete',
  'head',
  'put',
] as const;

type Result = {
  webhooks: (WebhookItem & { tags?: string[] })[];
  operations: (OperationItem & {
    tags?: string[];
  })[];
};

export function getAPIPageItems(document: NoReference<Document>): Result {
  const result: Result = { webhooks: [], operations: [] };

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem) continue;

    for (const methodKey of methodKeys) {
      if (!pathItem[methodKey]) continue;

      result.operations.push({
        method: methodKey as OpenAPIV3_1.HttpMethods,
        path,
        tags: pathItem[methodKey]?.tags,
      });
    }
  }

  for (const [name, pathItem] of Object.entries(document.webhooks ?? {})) {
    if (!pathItem) continue;

    for (const methodKey of methodKeys) {
      if (!pathItem[methodKey]) continue;

      result.webhooks.push({
        method: methodKey as OpenAPIV3_1.HttpMethods,
        name,
        tags: pathItem[methodKey]?.tags,
      });
    }
  }

  return result;
}
