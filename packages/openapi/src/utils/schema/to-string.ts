import type { ParsedSchema } from '@/utils/schema';
import type { DereferencedDocument } from '@/utils/document/dereference';

export enum FormatFlags {
  None = 0,
  UseAlias = 1 << 0,
}

type Resolver = (schema: ParsedSchema) => {
  /** swallowly dereferenced schema */
  dereferenced: ParsedSchema;
  raw?: ParsedSchema;
};

export function schemaToString(
  value: ParsedSchema,
  _resolver?: DereferencedDocument | Resolver,
  flags: FormatFlags = FormatFlags.None,
): string {
  const resolver: Resolver =
    typeof _resolver === 'function'
      ? _resolver
      : (schema) => {
          const ref =
            _resolver && typeof schema === 'object' ? _resolver.getRawRef(schema) : undefined;

          return {
            dereferenced: schema,
            raw: ref ? { $ref: ref } : undefined,
          };
        };
  function union(union: readonly ParsedSchema[], sep: string, flags: FormatFlags) {
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

  function run(input: ParsedSchema, flags: FormatFlags): string {
    const { dereferenced: schema, raw } = resolver(input);

    if (schema === true) return 'any';
    else if (schema === false) return 'never';

    if ((flags & FormatFlags.UseAlias) === FormatFlags.UseAlias) {
      if (schema.title) return schema.title;

      if (typeof raw === 'object' && raw.$ref) {
        const ref = raw.$ref.split('/');
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

    const or = schema.oneOf ?? schema.anyOf;
    if (schema.oneOf && schema.anyOf) {
      return `(${union(schema.oneOf, ' | ', flags)}) & (${union(schema.anyOf, ' | ', flags)})`;
    } else if (or) {
      return union(or, ' | ', flags);
    }

    if (schema.allOf) {
      return union(schema.allOf, ' & ', flags);
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
