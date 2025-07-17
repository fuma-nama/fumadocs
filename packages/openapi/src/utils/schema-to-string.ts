import { type ResolvedSchema } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';

export function schemaToString(
  value: ResolvedSchema,
  ctx?: ProcessedDocument,
): string {
  function union(union: readonly ResolvedSchema[], sep: string) {
    const members = new Set();
    let nullable = false;

    for (const item of union) {
      const result = run(item);
      if (result === 'null') {
        nullable = true;
      } else if (result !== 'unknown') {
        members.add(result);
      }
    }

    const result = Array.from(members).join(sep);
    return nullable ? `${result} | null` : result;
  }

  function run(schema: ResolvedSchema): string {
    if (schema === true) return 'any';
    else if (schema === false) return 'never';

    if (schema.title) return schema.title;
    const referenceName = ctx?.dereferenceMap.get(schema);
    if (referenceName) return referenceName.split('/').at(-1)!;

    if (Array.isArray(schema.type)) {
      const members = new Set();
      const types = schema.type;
      for (const type of types) {
        schema.type = type;
        const str = run(schema);
        schema.type = types;

        if (str !== 'unknown') members.add(str);
      }

      return Array.from(members).join(' | ');
    }

    if (schema.type === 'array')
      return `array<${schema.items ? run(schema.items) : 'unknown'}>`;

    if (schema.oneOf) {
      return union(schema.oneOf, ' | ');
    }

    const combinedOf = schema.anyOf ?? schema.allOf;
    if (combinedOf) {
      return union(combinedOf, ' & ');
    }

    if (schema.not) return `not ${run(schema.not)}`;
    if (schema.type === 'string' && schema.format === 'binary') return 'file';

    if (schema.type && Array.isArray(schema.type)) {
      return schema.type.filter((v) => v !== 'null').join(' | ');
    }

    if (schema.type) {
      return schema.type as string;
    }

    return 'unknown';
  }

  return run(value);
}
