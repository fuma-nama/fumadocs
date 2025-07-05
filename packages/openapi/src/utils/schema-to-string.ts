import { type ParsedSchema, type ResolvedSchema } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';

export function schemaToString(
  value: ResolvedSchema,
  ctx?: ProcessedDocument,
): string {
  function run(schema: ResolvedSchema, isRoot: boolean): string {
    if (schema === true) return 'any';
    else if (schema === false) return 'never';

    if (isNullable(schema) && isRoot) {
      const type = run(schema, false);

      // null if schema only contains `nullable`
      return type === 'unknown' ? 'null' : `${type} | null`;
    }

    if (schema.title) return schema.title;
    const referenceName = ctx?.dereferenceMap.get(schema);
    if (referenceName) return referenceName.split('/').at(-1)!;

    if (Array.isArray(schema.type)) {
      return schema.type
        .map((type, _, originalType) => {
          schema.type = type;
          const str = run(schema, false);
          schema.type = originalType;

          return str;
        })
        .filter((v) => v !== 'unknown' && v !== 'null')
        .join(' | ');
    }

    if (schema.type === 'array')
      return `array<${schema.items ? run(schema.items, true) : 'unknown'}>`;

    if (schema.oneOf) {
      return schema.oneOf
        .map((one) => run(one, false))
        .filter((v) => v !== 'unknown' && v !== 'null')
        .join(' | ');
    }

    const combinedOf = schema.anyOf ?? schema.allOf;
    if (combinedOf) {
      return combinedOf
        .map((one) => run(one, false))
        .filter((v) => v !== 'unknown' && v !== 'null')
        .join(' & ');
    }

    if (schema.not) return `not ${run(schema.not, false)}`;
    if (schema.type === 'string' && schema.format === 'binary') return 'file';

    if (schema.type && Array.isArray(schema.type)) {
      return schema.type.filter((v) => v !== 'null').join(' | ');
    }

    if (schema.type) {
      return schema.type as string;
    }

    return 'unknown';
  }

  return run(value, true);
}

function isNullable(schema: ParsedSchema): boolean {
  if (typeof schema === 'boolean') return false;

  if (Array.isArray(schema.type) && schema.type.includes('null')) return true;
  const combined = schema.anyOf ?? schema.oneOf ?? schema.allOf;
  if (combined && combined.some(isNullable)) return true;

  return schema.type === 'null';
}
