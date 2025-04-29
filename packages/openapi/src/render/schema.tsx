import { type ReactNode } from 'react';
import { isNullable, type ResolvedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { combineSchema } from '@/utils/combine-schema';
import { Markdown } from './markdown';

const keys: {
  [T in keyof Exclude<ResolvedSchema, boolean>]: string;
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
  stack?: ResolvedSchema[];

  render: RenderContext;
}

function isObject(schema: ResolvedSchema): boolean {
  if (typeof schema === 'boolean') return false;

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
  schema: ResolvedSchema;

  /**
   * Render the full object
   *
   * @defaultValue true
   * */
  parseObject?: boolean;

  ctx: Context;
}): ReactNode {
  const {
    render: { renderer },
    stack = [],
  } = ctx;

  if (schema === true) {
    return <renderer.Property name={name} type="any" />;
  } else if (schema === false) {
    return <renderer.Property name={name} type="never" />;
  }

  if (
    (schema.readOnly === true && !ctx.readOnly) ||
    (schema.writeOnly === true && !ctx.writeOnly)
  )
    return null;

  // object type
  if (
    isObject(schema) &&
    parseObject &&
    (schema.additionalProperties || schema.properties)
  ) {
    const { additionalProperties, patternProperties, properties } = schema;

    return (
      <div className="flex flex-col gap-4">
        {properties &&
          Object.entries(properties).map(([key, value]) => {
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
          })}
        {patternProperties &&
          Object.entries(patternProperties).map(([key, value]) => {
            return (
              <Schema
                key={key}
                name={key}
                schema={value}
                parseObject={false}
                ctx={{
                  ...ctx,
                  stack: [schema, ...stack],
                }}
              />
            );
          })}
        {additionalProperties && (
          <Schema
            name="[key: string]"
            schema={additionalProperties}
            parseObject={false}
            ctx={{
              ...ctx,
              stack: [schema, ...stack],
            }}
          />
        )}
      </div>
    );
  }

  if (schema.allOf && parseObject) {
    return (
      <Schema
        name={name}
        schema={combineSchema(schema.allOf as ResolvedSchema[])}
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
        value: JSON.stringify(schema[key as keyof ResolvedSchema]),
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
            typeof s === 'object' && s.title
              ? s.title
              : mentionedObjectTypes.length === 1
                ? 'Show Attributes'
                : `Object ${idx + 1}`
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
function isComplexType(schema: ResolvedSchema): boolean {
  if (typeof schema === 'boolean') return false;
  if (schema.anyOf ?? schema.oneOf ?? schema.allOf) return true;

  return isObject(schema) || schema.type === 'array';
}

function getSchemaType(
  schema: ResolvedSchema,
  ctx: Context,
  isRoot = true,
): string {
  if (schema === true) return 'any';
  else if (schema === false) return 'never';

  if (isNullable(schema) && isRoot) {
    const type = getSchemaType(schema, ctx, false);

    // null if schema only contains `nullable`
    return type === 'unknown' ? 'null' : `${type} | null`;
  }

  if (schema.title) return schema.title;

  if (Array.isArray(schema.type)) {
    return schema.type
      .map((type) =>
        getSchemaType(
          {
            ...schema,
            type,
          },
          ctx,
          false,
        ),
      )
      .join(' | ');
  }

  if (schema.type === 'array')
    return `array<${schema.items ? getSchemaType(schema.items, ctx) : 'unknown'}>`;

  if (schema.oneOf) {
    return schema.oneOf
      .map((one) => getSchemaType(one, ctx, false))
      .filter((v) => v !== 'unknown')
      .join(' | ');
  }

  if (schema.allOf) {
    return schema.allOf
      .map((one) => getSchemaType(one, ctx, false))
      .filter((v) => v !== 'unknown')
      .join(' & ');
  }

  if (schema.not) return `not ${getSchemaType(schema.not, ctx, false)}`;

  if (schema.anyOf) {
    const union = schema.anyOf
      .map((one) => getSchemaType(one, ctx, false))
      .filter((v) => v !== 'unknown');

    if (union.length > 1) {
      return `Any properties in ${union.join(',')}`;
    } else if (union.length === 1) {
      return union[0];
    }
  }

  if (schema.type === 'string' && schema.format === 'binary') return 'file';

  if (schema.type && Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((v) => v !== 'null');

    if (nonNullTypes.length > 0) return nonNullTypes.join(' | ');
  } else if (schema.type && schema.type !== 'null') {
    return schema.type as string;
  }

  if (isObject(schema)) return 'object';

  return 'unknown';
}
