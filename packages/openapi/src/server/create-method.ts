import type {
  MethodInformation,
  OperationObject,
  PathItemObject,
} from '@/types';
import type { NoReference } from '@/utils/schema';

/**
 * Summarize method endpoint information
 */
export function createMethod(
  method: string,
  path: NoReference<PathItemObject>,
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
