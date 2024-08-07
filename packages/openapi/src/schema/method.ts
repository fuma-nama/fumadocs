import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation } from '@/types';

export function createMethod(
  method: string,
  operation: OpenAPI.OperationObject,
): MethodInformation {
  return {
    ...operation,
    parameters: (operation.parameters ?? []) as OpenAPI.ParameterObject[],
    method: method.toUpperCase(),
  };
}
