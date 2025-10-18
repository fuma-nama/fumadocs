import { type ResolvedSchema } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';

export enum FormatFlags {
  None = 0,
  UseAlias = 1 << 0,
}

export function schemaToString(
  value: ResolvedSchema,
  ctx?: ProcessedDocument,
  flags: FormatFlags = FormatFlags.None,
): string {
  function union(
    union: readonly ResolvedSchema[],
    sep: string,
    flags: FormatFlags,
  ) {
    const members = new Set();
    let nullable = false;

    for (const item of union) {
      const result = run(item, flags | FormatFlags.UseAlias);

      if (result === 'null') {
        nullable = true;
      } else if (result !== 'unknown') {
        members.add(result);
      }
    }

    const result = Array.from(members).join(sep);
    return nullable ? `${result} | null` : result;
  }

  function run(schema: ResolvedSchema, flags: FormatFlags): string {
    if (schema === true) return 'any';
    else if (schema === false) return 'never';

    if ((flags & FormatFlags.UseAlias) === FormatFlags.UseAlias) {
      if (schema.title) return schema.title;

      const ref = ctx?.getRawRef(schema);
      if (ref) return ref.split('/').at(-1)!;
    }

    if (Array.isArray(schema.type)) {
      return union(
        schema.type.map((type) => ({
          ...schema,
          type,
        })),
        ' | ',
        flags,
      );
    }

    if (schema.type === 'array')
      return `array<${schema.items ? run(schema.items, flags | FormatFlags.UseAlias) : 'unknown'}>`;

    if (schema.oneOf) {
      return union(schema.oneOf, ' | ', flags);
    }

    const combinedOf = schema.anyOf ?? schema.allOf;
    if (combinedOf) {
      return union(combinedOf, ' & ', flags);
    }

    if (schema.not) return `not ${run(schema.not, flags)}`;
    if (schema.type === 'string' && schema.format === 'binary') return 'file';

    if (schema.type && Array.isArray(schema.type)) {
      return schema.type.filter((v) => v !== 'null').join(' | ');
    }

    if (schema.type) {
      return schema.type as string;
    }

    return 'unknown';
  }

  return run(value, flags);
}
