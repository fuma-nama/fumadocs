import type { CollectionSchema } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export class ValidationError extends Error {
  title: string;
  issues: readonly StandardSchemaV1.Issue[];

  constructor(message: string, issues: readonly StandardSchemaV1.Issue[]) {
    super(
      `${message}:\n${issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n')}`,
    );

    this.title = message;
    this.issues = issues;
  }

  async toStringFormatted() {
    // Handle ESM/CJS interop: picocolors is a CJS module that exports via
    // module.exports = createColors(). When dynamically imported in ESM context
    // (e.g., Next.js 16 Turbopack), the exports are wrapped under .default
    const picocolorsModule = await import('picocolors');
    const picocolors = picocolorsModule.default ?? picocolorsModule;

    return [
      picocolors.bold(`[MDX] ${this.title}:`),
      ...this.issues.map((issue) =>
        picocolors.redBright(
          `- ${picocolors.bold(issue.path?.join('.') ?? '*')}: ${issue.message}`,
        ),
      ),
    ].join('\n');
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
