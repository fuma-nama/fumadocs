import type { MethodInformation, OperationObject } from '@/types';
import { noRef } from '@/utils/schema';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Summarize method endpoint information
 */
export function createMethod(
  method: string,
  path: OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject,
  operation: OperationObject,
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
