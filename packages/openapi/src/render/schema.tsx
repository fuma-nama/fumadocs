import { type ReactNode } from 'react';
import { isNullable, NoReference, type ParsedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { combineSchema } from '@/utils/combine-schema';
import { Markdown } from './markdown';

const keys: {
  [T in keyof ParsedSchema]: string;
} = {
  default: 'Default',
  minimum: 'Minimum',
  maximum: 'Maximum',
  minLength: 'Minimum length',
  maxLength: 'Maximum length',
  pattern: 'Pattern',
  format: 'Format',
};

interface Context {
  readOnly: boolean;
  writeOnly: boolean;
  stack?: ParsedSchema[];

  render: RenderContext;
}

function isObject(schema: ParsedSchema): boolean {
  return (
    schema.type === 'object' ||
    schema.properties !== undefined ||
    schema.additionalProperties !== undefined
  );
}

export function Schema({
  name,
  schema,
  required = false,
  parseObject = true,
  ctx,
}: {
  name: string;
  required?: boolean;
  schema: NoReference<ParsedSchema>;

  /**
   * Render the full object
   *
   * @defaultValue true
   * */
  parseObject?: boolean;

  ctx: Context;
}): ReactNode {
  if (
    (schema.readOnly === true && !ctx.readOnly) ||
    (schema.writeOnly === true && !ctx.writeOnly)
  )
    return null;

  const {
    render: { renderer },
    stack = [],
  } = ctx;

  // object type
  if (
    isObject(schema) &&
    parseObject &&
    (schema.additionalProperties || schema.properties)
  ) {
    let body: ReactNode = null;
    let footer: ReactNode = null;
    const { additionalProperties, properties } = schema;

    if (additionalProperties === true) {
      footer = <renderer.Property name="[key: string]" type="any" />;
    } else if (additionalProperties) {
      footer = (
        <Schema
          name="[key: string]"
          schema={additionalProperties}
          parseObject={false}
          ctx={{
            ...ctx,
            stack: [schema, ...stack],
          }}
        />
      );
    }

    if (properties) {
      body = Object.entries(properties).map(([key, value]) => {
        return (
          <Schema
            key={key}
            name={key}
            schema={value}
            parseObject={false}
            required={schema.required?.includes(key) ?? false}
            ctx={{
              ...ctx,
              stack: [schema, ...stack],
            }}
          />
        );
      });
    }

    return (
      <div className="flex flex-col gap-4">
        {body}
        {footer}
      </div>
    );
  }

  if (schema.allOf && parseObject) {
    return (
      <Schema
        name={name}
        schema={combineSchema(schema.allOf)}
        ctx={{
          ...ctx,
          stack: [schema, ...stack],
        }}
      />
    );
  }

  let footer: ReactNode;
  const fields: {
    key: string;
    value: string;
  }[] = [];

  for (const [key, value] of Object.entries(keys)) {
    if (key in schema) {
      fields.push({
        key: value,
        value: JSON.stringify(schema[key as keyof ParsedSchema]),
      });
    }
  }

  if (schema.enum) {
    fields.push({
      key: 'Value in',
      value: schema.enum.map((value) => JSON.stringify(value)).join(' | '),
    });
  }

  if (isObject(schema) && !parseObject && !stack.includes(schema)) {
    footer = (
      <renderer.ObjectCollapsible name="Show Attributes">
        <Schema
          name={name}
          schema={schema}
          ctx={{
            ...ctx,
            stack: [schema, ...stack],
          }}
        />
      </renderer.ObjectCollapsible>
    );
  } else {
    const mentionedObjectTypes = [
      ...(schema.anyOf ?? schema.oneOf ?? []),
      ...(schema.not ? [schema.not] : []),
      ...(schema.type === 'array' && schema.items ? [schema.items] : []),
    ].filter((s) => isComplexType(s) && !stack.includes(s));

    footer = mentionedObjectTypes.map((s, idx) => {
      return (
        <renderer.ObjectCollapsible
          key={idx}
          name={
            s.title ??
            (mentionedObjectTypes.length === 1
              ? 'Show Attributes'
              : `Object ${idx + 1}`)
          }
        >
          <Schema
            name="element"
            schema={s}
            ctx={{
              ...ctx,
              stack: [schema, ...stack],
            }}
          />
        </renderer.ObjectCollapsible>
      );
    });
  }

  return (
    <renderer.Property
      name={name}
      type={getSchemaType(schema, ctx)}
      required={required}
      deprecated={schema.deprecated}
    >
      {schema.description ? <Markdown text={schema.description} /> : null}
      {fields.length > 0 ? (
        <div className="flex flex-col gap-2">
          {fields.map((field) => (
            <span key={field.key}>
              {field.key}: <code>{field.value}</code>
            </span>
          ))}
        </div>
      ) : null}
      {footer}
    </renderer.Property>
  );
}

/**
 * Check if the schema needs another collapsible to explain
 */
function isComplexType(schema: ParsedSchema): boolean {
  if (schema.anyOf ?? schema.oneOf ?? schema.allOf) return true;

  return isObject(schema) || schema.type === 'array';
}

function getSchemaType(
  schema: ParsedSchema,
  ctx: Context,
  isRoot = true,
): string {
  if (isNullable(schema) && isRoot) {
    const type = getSchemaType(schema, ctx, false);

    // null if schema only contains `nullable`
    return type === 'unknown' ? 'null' : `${type} | null`;
  }

  if (schema.title) return schema.title;

  if (schema.type === 'array')
    return `array<${schema.items ? getSchemaType(schema.items, ctx) : 'unknown'}>`;

  if (schema.oneOf)
    return schema.oneOf
      .map((one) => getSchemaType(one, ctx, false))
      .filter((v) => v !== 'unknown')
      .join(' | ');

  if (schema.allOf) {
    return schema.allOf
      .map((one) => getSchemaType(one, ctx, false))
      .filter((v) => v !== 'unknown')
      .join(' & ');
  }

  if (schema.not) return `not ${getSchemaType(schema.not, ctx, false)}`;

  if (schema.anyOf) {
    const properties = schema.anyOf
      .map((one) => getSchemaType(one, ctx, false))
      .filter((v) => v !== 'unknown');

    if (properties.length > 1) {
      return `Any properties in ${properties.join(',')}`;
    } else if (properties.length === 1) {
      return properties[0];
    }
    // otherwise unknown
  }

  if (schema.type === 'string' && schema.format === 'binary') return 'file';

  if (schema.type && Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((v) => v !== 'null');

    if (nonNullTypes.length > 0) return nonNullTypes.join(' | ');
  } else if (schema.type && schema.type !== 'null') {
    return schema.type;
  }

  if (isObject(schema)) return 'object';

  return 'unknown';
}
