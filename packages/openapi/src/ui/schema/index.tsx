import type { ReactNode } from 'react';
import type { ResolvedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { FormatFlags, schemaToString } from '@/utils/schema-to-string';
import { Markdown } from '@/ui/components/server/markdown';
import { combineSchema } from '@/utils/combine-schema';
import {
  SchemaUI,
  type SchemaUIProps,
  SchemaUIProvider,
} from '@/ui/schema/client';

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

export interface SchemaUIData {
  $root: string;
  refs: Record<string, SchemaData>;
}

export function Schema(
  props: SchemaUIOptions &
    SchemaUIProps & {
      readOnly?: boolean;
      writeOnly?: boolean;
    },
) {
  const data = generateSchemaUI(props);

  return (
    <SchemaUIProvider
      value={{
        ...data,
        readOnly: props.readOnly,
        writeOnly: props.writeOnly,
      }}
    >
      <SchemaUI name={props.name} required={props.required} as={props.as} />
    </SchemaUIProvider>
  );
}

function generateSchemaUI({ ctx, root }: SchemaUIOptions): SchemaUIData {
  const refs: Record<string, SchemaData> = {};
  const { content: { showExampleInFields = false } = {} } = ctx;

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

    let range = getRange(
      'value',
      schema.minimum,
      schema.exclusiveMinimum,
      schema.maximum,
      schema.exclusiveMaximum,
    );
    if (range) fields.push(field('Range', range));

    range = getRange(
      'length',
      schema.minLength,
      undefined,
      schema.maxLength,
      undefined,
    );
    if (range) fields.push(field('Length', range));

    range = getRange(
      'properties',
      schema.minProperties,
      undefined,
      schema.maxProperties,
      undefined,
    );
    if (range) fields.push(field('Properties', range));

    range = getRange(
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

    if (showExampleInFields && schema.examples) {
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
      description: schema.description && <Markdown text={schema.description} />,
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
        const $type = getSchemaId(item);

        scanRefs($type, item);
        out.items.push({
          name: schemaToString(item, ctx.schema, FormatFlags.UseAlias),
          $type,
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

function getRange(
  value: string,
  min: number | undefined,
  exclusiveMin: number | undefined,
  max: number | undefined,
  exclusiveMax: number | undefined,
) {
  const out = [];
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
