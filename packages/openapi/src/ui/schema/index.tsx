import type { ReactNode } from 'react';
import type { ResolvedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { FormatFlags, schemaToString } from '@/utils/schema-to-string';
import { mergeAllOf } from '@/utils/merge-schema';
import type { SchemaUIProps } from '@/ui/schema/client';
import { SchemaUILazy } from '@/ui/schema/lazy';

export interface FieldBase {
  description?: ReactNode;
  infoTags?: InfoTag[];

  typeName: string;
  aliasName: string;

  deprecated?: boolean;
}

export interface InfoTag {
  label: string;
  value: string;
}

export type SchemaData = FieldBase &
  (
    | {
        type: 'primitive';
      }
    | {
        type: 'object';
        props: {
          name: string;
          $type: string;
          required: boolean;
        }[];
      }
    | {
        type: 'array';
        item: {
          $type: string;
        };
      }
    | {
        type: 'or';
        items: {
          name: string;
          $type: string;
        }[];
      }
    | {
        type: 'and';
        items: {
          name: string;
          $type: string;
        }[];
      }
  );

export interface SchemaUIOptions {
  root: ResolvedSchema;
  client: Omit<SchemaUIProps, 'generated'>;

  /**
   * include read only props
   */
  readOnly?: boolean;
  /**
   * include write only props
   */
  writeOnly?: boolean;
}

export interface SchemaUIGeneratedData {
  $root: string;
  refs: Record<string, SchemaData>;
}

export function Schema({
  ctx,
  ...options
}: SchemaUIOptions & {
  ctx: RenderContext;
}) {
  if (ctx.schemaUI?.render) {
    return ctx.schemaUI.render(options, ctx);
  }

  return <SchemaUILazy {...options.client} generated={generateSchemaUI(options, ctx)} />;
}

export function generateSchemaUI(
  { root, readOnly, writeOnly }: SchemaUIOptions,
  ctx: RenderContext,
): SchemaUIGeneratedData {
  const refs: Record<string, SchemaData> = {};
  const { showExample = false } = ctx.schemaUI ?? {};

  function generateInfoTags(schema: Exclude<ResolvedSchema, boolean>) {
    const fields: InfoTag[] = [];

    if (schema.default !== undefined) {
      fields.push({ label: 'Default', value: JSON.stringify(schema.default) });
    }

    if (schema.pattern) {
      fields.push({ label: 'Match', value: schema.pattern });
    }

    if (schema.format) {
      fields.push({ label: 'Format', value: schema.format });
    }

    if (schema.multipleOf) {
      fields.push({ label: 'Multiple Of', value: schema.multipleOf.toString() });
    }

    let range = formatRange(
      'value',
      schema.minimum,
      schema.exclusiveMinimum,
      schema.maximum,
      schema.exclusiveMaximum,
    );
    if (range) fields.push({ label: 'Range', value: range });

    range = formatRange('length', schema.minLength, undefined, schema.maxLength, undefined);
    if (range) fields.push({ label: 'Length', value: range });

    range = formatRange(
      'properties',
      schema.minProperties,
      undefined,
      schema.maxProperties,
      undefined,
    );
    if (range) fields.push({ label: 'Properties', value: range });

    range = formatRange('items', schema.minItems, undefined, schema.maxItems, undefined);
    if (range) fields.push({ label: 'Items', value: range });

    if (schema.enum) {
      fields.push({
        label: 'Value in',
        value: schema.enum.map((value) => JSON.stringify(value)).join(' | '),
      });
    }

    if (showExample && schema.examples) {
      for (const example of schema.examples) {
        fields.push({ label: 'Example', value: JSON.stringify(example, null, 2) });
      }
    }

    return fields;
  }

  let _counter = 0;
  const autoIds = new WeakMap();
  function getSchemaId(schema: ResolvedSchema) {
    if (typeof schema === 'boolean') return String(schema);
    const raw = ctx.schema.getRawRef(schema);
    if (raw) return raw;

    const prev = autoIds.get(schema);
    if (prev) return prev;

    const generated = `__${_counter++}`;
    autoIds.set(schema, generated);
    return generated;
  }

  function isVisible(schema: ResolvedSchema): boolean {
    if (typeof schema === 'boolean') return true;
    if (schema.writeOnly) return writeOnly ?? false;
    if (schema.readOnly) return readOnly ?? false;
    return true;
  }

  function base(schema: ResolvedSchema): FieldBase {
    if (typeof schema === 'boolean') {
      const name = schema ? 'any' : 'never';
      return {
        typeName: name,
        aliasName: name,
      };
    }

    return {
      description: schema.description && ctx.renderMarkdown(schema.description),
      infoTags: generateInfoTags(schema),
      typeName: schemaToString(schema, ctx.schema),
      aliasName: schemaToString(schema, ctx.schema, FormatFlags.UseAlias),
      deprecated: schema.deprecated,
    };
  }

  function scanRefs(id: string, schema: ResolvedSchema) {
    if (id in refs) return;
    if (typeof schema === 'boolean') {
      refs[id] = {
        type: 'primitive',
        ...base(schema),
      };
      return;
    }

    if (Array.isArray(schema.type)) {
      const out: SchemaData = {
        type: 'or',
        items: [],
        ...base(schema),
      };
      refs[id] = out;

      for (const type of schema.type) {
        const key = `${id}_type:${type}`;
        scanRefs(key, {
          ...schema,
          type,
        });
        out.items.push({
          name: type,
          $type: key,
        });
      }
      return;
    }

    if (schema.oneOf && schema.anyOf) {
      const out: SchemaData = {
        type: 'and',
        items: [],
        ...base(schema),
      };
      refs[id] = out;
      for (const omit of ['anyOf', 'oneOf'] as const) {
        const $type = `${id}_omit:${omit}`;
        scanRefs($type, { ...schema, [omit]: undefined });

        out.items.push({
          name: refs[$type].aliasName,
          $type,
        });
      }
      return;
    }

    // display both `oneOf` & `anyOf` as OR for simplified overview
    const union = schema.oneOf ?? schema.anyOf;
    if (union) {
      const out: SchemaData = {
        type: 'or',
        items: [],
        ...base(schema),
      };
      refs[id] = out;

      for (const item of union) {
        if (typeof item !== 'object' || !isVisible(item)) continue;
        const itemId = getSchemaId(item);
        const key = `${id}_extends:${itemId}`;

        scanRefs(key, {
          ...schema,
          oneOf: undefined,
          anyOf: undefined,
          ...item,
          properties: {
            ...schema.properties,
            ...item.properties,
          },
        });
        out.items.push({
          $type: key,
          name: refs[itemId]?.aliasName ?? schemaToString(item, ctx.schema, FormatFlags.UseAlias),
        });
      }
      return;
    }

    if (schema.allOf) {
      scanRefs(id, mergeAllOf(schema));
      return;
    }

    if (schema.type === 'object') {
      const out: SchemaData = {
        type: 'object',
        props: [],
        ...base(schema),
      };
      refs[id] = out;

      const { properties = {}, patternProperties, additionalProperties } = schema;
      const props = Object.entries(properties);
      if (patternProperties) props.push(...Object.entries(patternProperties));

      for (const [key, prop] of props) {
        if (!isVisible(prop)) continue;
        const $type = getSchemaId(prop);
        scanRefs($type, prop);
        out.props.push({
          $type,
          name: key,
          required: schema.required?.includes(key) ?? false,
        });
      }

      if (additionalProperties !== undefined && isVisible(additionalProperties)) {
        const $type = getSchemaId(additionalProperties);
        scanRefs($type, additionalProperties);

        out.props.push({
          $type,
          name: '[key: string]',
          required: false,
        });
      }
      return;
    }

    if (schema.type === 'array') {
      const items = schema.items ?? true;
      const $type = getSchemaId(items);

      refs[id] = {
        type: 'array',
        item: {
          $type,
        },
        ...base(schema),
      };
      scanRefs($type, items);
      return;
    }

    refs[id] = {
      type: 'primitive',
      ...base(schema),
    };
  }

  const $root = getSchemaId(root);
  scanRefs($root, root);
  return {
    refs,
    $root,
  };
}

function formatRange(
  value: string,
  min: number | undefined,
  exclusiveMin: number | undefined,
  max: number | undefined,
  exclusiveMax: number | undefined,
) {
  const out: string[] = [];
  if (min !== undefined) {
    out.push(`${min} <=`);
  } else if (exclusiveMin !== undefined) {
    out.push(`${exclusiveMin} <`);
  }

  out.push(value);
  if (max !== undefined) {
    out.push(`<= ${max}`);
  } else if (exclusiveMax !== undefined) {
    out.push(`< ${exclusiveMax}`);
  }
  if (out.length > 1) return out.join(' ');
}
