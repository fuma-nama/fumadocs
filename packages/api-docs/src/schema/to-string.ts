import type { ParsedSchema, SchemaResolver } from '@/schema';

export enum FormatFlags {
  None = 0,
  UseAlias = 1 << 0,
}

export function schemaToString(
  value: ParsedSchema,
  resolver?: SchemaResolver,
  flags: FormatFlags = FormatFlags.None,
): string {
  function union(union: readonly ParsedSchema[], sep: string, flags: FormatFlags): string {
    const members = new Set();
    const out: string[] = [];
    let nullable = false;

    for (const item of union) {
      const result = run(item, flags | FormatFlags.UseAlias);

      if (result === 'null') {
        nullable = true;
      } else if (result !== 'unknown' && !members.has(result)) {
        out.push(result);
        members.add(result);
      }
    }

    if (nullable) out.push('null');
    return out.join(sep);
  }

  function run(input: ParsedSchema, flags: FormatFlags): string {
    const { dereferenced: schema, $ref: rawRef } = resolver?.(input) ?? { dereferenced: input };

    if (schema === true) return 'any';
    else if (schema === false) return 'never';

    if ((flags & FormatFlags.UseAlias) === FormatFlags.UseAlias) {
      if (schema.title) return schema.title;

      if (typeof rawRef === 'string') {
        const ref = rawRef.split('/');
        if (ref.length > 0) return ref[ref.length - 1];
      }
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

    if (schema.oneOf && schema.anyOf) {
      return `(${union(schema.oneOf, ' | ', flags)}) & (${union(schema.anyOf, ' | ', flags)})`;
    }

    const or = schema.oneOf ?? schema.anyOf;
    if (or) {
      return union(or, ' | ', flags);
    }

    if (schema.allOf) {
      return union(schema.allOf, ' & ', flags);
    }

    if (schema.not) return `not (${run(schema.not, flags)})`;
    if (schema.type === 'string' && schema.format === 'binary') return 'file';

    if (typeof schema.type === 'string') {
      return schema.type;
    }

    return 'unknown';
  }

  return run(value, flags);
}
