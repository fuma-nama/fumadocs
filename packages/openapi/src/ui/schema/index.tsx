import type { ReactNode } from 'react';
import type { ResolvedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { FormatFlags, schemaToString } from '@/utils/schema-to-string';
import { combineSchema } from '@/utils/combine-schema';
import type { SchemaUIProps } from '@/ui/schema/client';
import { SchemaUILazy } from '@/ui/schema/lazy';

export interface FieldBase {
  description?: ReactNode;
  infoTags?: ReactNode[];

  typeName: string;
  aliasName: string;

  deprecated?: boolean;
  writeOnly?: boolean;
  readOnly?: boolean;
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
  );

export interface SchemaUIOptions {
  root: ResolvedSchema;
  ctx: RenderContext;
}

export interface SchemaUIGeneratedData {
  $root: string;
  refs: Record<string, SchemaData>;
}

export function Schema({
  ctx,
  root,
  ...props
}: SchemaUIOptions & Omit<SchemaUIProps, 'generated'>) {
  if (ctx.schemaUI?.render) {
    return ctx.schemaUI.render({ root, ...props }, ctx);
  }

  return (
    <SchemaUILazy {...props} generated={generateSchemaUI({ ctx, root })} />
  );
}

export function generateSchemaUI({
  ctx,
  root,
}: SchemaUIOptions): SchemaUIGeneratedData {
  const refs: Record<string, SchemaData> = {};
  const { showExample = false } = ctx.schemaUI ?? {};

  function generateInfoTags(schema: Exclude<ResolvedSchema, boolean>) {
    const fields: ReactNode[] = [];

    function field(key: string, value: ReactNode) {
      return (
        <div className="bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md">
          <span className="font-medium me-2">{key}</span>
          <code className="text-fd-muted-foreground">{value}</code>
        </div>
      );
    }

    if (schema.default !== undefined) {
      fields.push(field('Default', JSON.stringify(schema.default)));
    }

    if (schema.pattern) {
      fields.push(field('Match', schema.pattern));
    }

    if (schema.format) {
      fields.push(field('Format', schema.format));
    }

    if (schema.multipleOf) {
      fields.push(field('Multiple Of', schema.multipleOf));
    }

    let range = formatRange(
      'value',
      schema.minimum,
      schema.exclusiveMinimum,
      schema.maximum,
      schema.exclusiveMaximum,
    );
    if (range) fields.push(field('Range', range));

    range = formatRange(
      'length',
      schema.minLength,
      undefined,
      schema.maxLength,
      undefined,
    );
    if (range) fields.push(field('Length', range));

    range = formatRange(
      'properties',
      schema.minProperties,
      undefined,
      schema.maxProperties,
      undefined,
    );
    if (range) fields.push(field('Properties', range));

    range = formatRange(
      'items',
      schema.minItems,
      undefined,
      schema.maxItems,
      undefined,
    );
    if (range) fields.push(field('Items', range));

    if (schema.enum) {
      fields.push(
        field(
          'Value in',
          schema.enum.map((value) => JSON.stringify(value)).join(' | '),
        ),
      );
    }

    if (showExample && schema.examples) {
      for (const example of schema.examples) {
        fields.push(field('Example', JSON.stringify(example, null, 2)));
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
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
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
        const item = {
          ...schema,
          type,
        };

        const key = `${id}_type:${type}`;
        scanRefs(key, item);
        out.items.push({
          name: type,
          $type: key,
        });
      }
      return;
    }

    if (schema.oneOf) {
      const out: SchemaData = {
        type: 'or',
        items: [],
        ...base(schema),
      };
      refs[id] = out;

      for (const item of schema.oneOf) {
        if (typeof item !== 'object') continue;
        const key = `${id}_extends:${getSchemaId(item)}`;
        const extended = {
          ...schema,
          ...item,
        };
        delete extended['oneOf'];

        scanRefs(key, extended);
        out.items.push({
          $type: key,
          name: schemaToString(extended, ctx.schema, FormatFlags.UseAlias),
        });
      }
      return;
    }

    const of = schema.allOf ?? schema.anyOf;
    if (of) {
      const combined = combineSchema(of as ResolvedSchema[]);
      scanRefs(id, combined);
      return;
    }

    if (schema.type === 'object') {
      const out: SchemaData = {
        type: 'object',
        props: [],
        ...base(schema),
      };
      refs[id] = out;

      const props = Object.entries(schema.properties ?? {});
      if (schema.patternProperties)
        props.push(...Object.entries(schema.patternProperties));

      for (const [key, prop] of props) {
        const $type = getSchemaId(prop);
        scanRefs($type, prop);
        out.props.push({
          $type,
          name: key,
          required: schema.required?.includes(key) ?? false,
        });
      }

      if (schema.additionalProperties) {
        const $type = getSchemaId(schema.additionalProperties);
        scanRefs($type, schema.additionalProperties);

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
