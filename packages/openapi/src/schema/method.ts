import type { MethodInformation, OperationObject } from '@/types';
import type { NoReference } from '@/utils/schema';
import { OpenAPIV3_1 } from 'openapi-types';

/**
 * Summarize method endpoint information
 */
export function createMethod(
  method: string,
  path: NoReference<OpenAPIV3_1.PathItemObject>,
  operation: NoReference<OperationObject>,
): MethodInformation {
  return {
    description: path.description,
    summary: path.summary,
    ...operation,
    parameters: [...(operation.parameters ?? []), ...(path.parameters ?? [])],
    method: method.toUpperCase(),
  };
}
