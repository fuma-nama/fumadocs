import { z } from 'zod';
import type { CollectionSchema } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export const metaSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.string()).optional(),
  description: z.string().optional(),
  root: z.boolean().optional(),
  defaultOpen: z.boolean().optional(),
  icon: z.string().optional(),
});

export const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  full: z.boolean().optional(),

  // Fumadocs OpenAPI generated
  _openapi: z.object({}).passthrough().optional(),
});

export async function validate<Schema extends StandardSchemaV1, Context>(
  schema: CollectionSchema<Schema, Context>,
  data: unknown,
  context: Context,
  errorMessage: string,
): Promise<StandardSchemaV1.InferOutput<Schema>> {
  if (typeof schema === 'function' && !('~standard' in schema)) {
    schema = schema(context);
  }

  if ('~standard' in schema) {
    const result = await (schema as StandardSchemaV1)['~standard'].validate(
      data,
    );

    if (result.issues) {
      throw new Error(formatError(errorMessage, result.issues));
    }

    return result.value;
  }

  return data;
}

export function formatError(
  message: string,
  issues: readonly StandardSchemaV1.Issue[],
): string {
  return `${message}:\n${issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n')}`;
}
