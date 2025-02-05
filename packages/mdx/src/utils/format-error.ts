import { StandardSchemaV1 } from '@standard-schema/spec';

export function formatError(
  message: string,
  issues: readonly StandardSchemaV1.Issue[],
): string {
  return `${message}:\n${issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n')}`;
}
