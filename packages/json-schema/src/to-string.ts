import type { JsonSchema } from './types';
import { dereference } from './dereference';

export interface StringifyOptions {
  /**
   * Print the title (or the last segment of the `$ref`) of a named schema instead of its shape.
   *
   * Members of a union, array or intersection always use their alias.
   */
  alias?: boolean;
}

/**
 * Format a schema as a readable type, e.g. `array<Planet | null>`.
 */
export function stringify(value: JsonSchema, { alias = false }: StringifyOptions = {}): string {
  function union(union: readonly JsonSchema[], sep: string): string {
    const members = new Set();
    const out: string[] = [];
    let nullable = false;

    for (const item of union) {
      const result = run(item, true);

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

  function run(input: JsonSchema, alias: boolean): string {
    const rawRef =
      typeof input === 'object' && typeof input.$ref === 'string' ? input.$ref : undefined;
    const schema = dereference(input);

    if (schema === true) return 'any';
    else if (schema === false) return 'never';

    if (schema.enum?.length === 1) {
      switch (typeof schema.enum[0]) {
        case 'bigint':
        case 'boolean':
        case 'number':
        case 'string':
          return JSON.stringify(schema.enum[0]);
      }
    }

    if (alias) {
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
      );
    }

    if (schema.type === 'array')
      return `array<${schema.items ? run(schema.items, true) : 'unknown'}>`;

    if (schema.oneOf && schema.anyOf) {
      return `(${union(schema.oneOf, ' | ')}) & (${union(schema.anyOf, ' | ')})`;
    }

    const or = schema.oneOf ?? schema.anyOf;
    if (or) {
      return union(or, ' | ');
    }

    if (schema.allOf) {
      return union(schema.allOf, ' & ');
    }

    if (schema.not) return `not (${run(schema.not, alias)})`;
    if (schema.type === 'string' && schema.format === 'binary') return 'file';

    if (typeof schema.type === 'string') {
      return schema.type;
    }

    return 'unknown';
  }

  return run(value, alias);
}
