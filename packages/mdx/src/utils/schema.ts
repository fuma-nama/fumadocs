import { z } from 'zod';
import type { CollectionSchema } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import picocolors from 'picocolors';

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

export class ValidationError extends Error {
  issues: readonly StandardSchemaV1.Issue[];

  constructor(message: string, issues: readonly StandardSchemaV1.Issue[]) {
    super(message);
    this.issues = issues;
  }

  print() {
    console.error(
      [
        `[MDX] ${this.message}:`,
        ...this.issues.map((issue) =>
          picocolors.redBright(
            `- ${picocolors.bold(issue.path?.join('.') ?? '*')}: ${issue.message}`,
          ),
        ),
      ].join('\n'),
    );
  }

  toString() {
    return `${this.message}:\n${this.issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n')}`;
  }
}

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
      throw new ValidationError(errorMessage, result.issues);
    }

    return result.value;
  }

  return data;
}
