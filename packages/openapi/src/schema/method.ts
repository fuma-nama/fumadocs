import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation } from '@/types';
import { noRef } from '@/utils/schema';

/**
 * Summarize method endpoint information
 */
export function createMethod(
  method: string,
  path: OpenAPI.PathItemObject,
  operation: OpenAPI.OperationObject,
): MethodInformation {
  return {
    description: path.description,
    summary: path.summary,
    ...operation,
    parameters: [
      ...noRef(operation.parameters ?? []),
      ...noRef(path.parameters ?? []),
    ],
    method: method.toUpperCase(),
  };
}
