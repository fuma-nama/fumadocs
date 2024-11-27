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

  required: boolean;

  /**
   * Render the full object
   *
   * @defaultValue true
   * */
  parseObject?: boolean;

  /**
   * Parse binary format string to be files
   *
   * @defaultValue false
   */
  allowFile?: boolean;

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
  ctx,
}: {
  name: string;
  schema: NoReference<ParsedSchema>;
  ctx: Context;
}): ReactNode {
  if (
    (schema.readOnly === true && !ctx.readOnly) ||
    (schema.writeOnly === true && !ctx.writeOnly)
  )
    return null;

  const parseObject = ctx.parseObject ?? true;
  const stack = ctx.stack ?? [];
  const { renderer } = ctx.render;
  const child: ReactNode[] = [];

  // object type
  if (
    isObject(schema) &&
    parseObject &&
    (schema.additionalProperties || schema.properties)
  ) {
    const { additionalProperties, properties } = schema;

    if (additionalProperties === true) {
      child.push(
        <renderer.Property
          key="additionalProperties"
          name="[key: string]"
          type="any"
        />,
      );
    } else if (additionalProperties) {
      child.push(
        <Schema
          key="additionalProperties"
          name="[key: string]"
          schema={additionalProperties}
          ctx={{
            ...ctx,
            required: false,
            parseObject: false,
          }}
        />,
      );
    }

    if (properties) {
      const rendered = Object.entries(properties).map(([key, value]) => {
        return (
          <Schema
            key={key}
            name={key}
            schema={value}
            ctx={{
              ...ctx,
              required: schema.required?.includes(key) ?? false,
              parseObject: false,
            }}
          />
        );
      });

      child.push(...rendered);
    }

    return child;
  }

  if (schema.allOf && parseObject) {
    return (
      <Schema name={name} schema={combineSchema(schema.allOf)} ctx={ctx} />
    );
  }

  if (schema.description)
    child.push(<Markdown key="description" text={schema.description} />);

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

  if (fields.length > 0)
    child.push(
      <div key="fields" className="flex flex-col gap-2">
        {fields.map((field) => (
          <span key={field.key}>
            {field.key}: <code>{field.value}</code>
          </span>
        ))}
      </div>,
    );

  if ((isObject(schema) || schema.allOf) && !parseObject) {
    child.push(
      <renderer.ObjectCollapsible key="attributes" name="Attributes">
        <Schema
          name={name}
          schema={schema}
          ctx={{
            ...ctx,
            parseObject: true,
            required: false,
          }}
        />
      </renderer.ObjectCollapsible>,
    );
  } else {
    const mentionedObjectTypes = [
      ...(schema.anyOf ?? schema.oneOf ?? []),
      ...(schema.not ? [schema.not] : []),
      ...(schema.type === 'array' ? [schema.items] : []),
    ].filter((s) => isComplexType(s) && !stack.includes(s));

    const renderedMentionedTypes = mentionedObjectTypes.map((s, idx) => {
      return (
        <renderer.ObjectCollapsible
          key={`mentioned:${idx.toString()}`}
          name={s.title ?? `Object ${(idx + 1).toString()}`}
        >
          <Schema
            name="element"
            schema={s}
            ctx={{
              ...ctx,
              stack: [schema, ...stack],
              parseObject: true,
              required: false,
            }}
          />
        </renderer.ObjectCollapsible>
      );
    });

    child.push(...renderedMentionedTypes);
  }

  return (
    <renderer.Property
      name={name}
      type={getSchemaType(schema, ctx)}
      required={ctx.required}
      deprecated={schema.deprecated}
    >
      {child}
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
  nullable = true,
): string {
  if (nullable && isNullable(schema)) {
    const type = getSchemaType(schema, ctx, false);

    // null if schema only contains `nullable`
    return type === 'unknown' ? 'null' : `${type} | null`;
  }

  if (schema.title) return schema.title;

  if (schema.type === 'array')
    return `array<${getSchemaType(schema.items, ctx, nullable)}>`;

  if (schema.oneOf)
    return schema.oneOf
      .map((one) => getSchemaType(one, ctx, nullable))
      .filter((v) => v !== 'unknown')
      .join(' | ');

  if (schema.allOf) {
    const allTypeNames = schema.allOf
      .map((one) => getSchemaType(one, ctx, nullable))
      .filter((v) => v !== 'unknown');

    const nonNullTypes = allTypeNames.filter((v) => v !== 'null');
    const nonNullTypeNames = nonNullTypes.join(' & ');
    const hasNull = nonNullTypes.length !== allTypeNames.length;

    if (!hasNull) return nonNullTypeNames;

    if (nonNullTypes.length === 0) return 'null';
    else if (nonNullTypes.length === 1 || !hasNull)
      return `${nonNullTypeNames} | null`;
    else return `(${nonNullTypeNames}) | null`;
  }

  if (schema.not) return `not ${getSchemaType(schema.not, ctx, nullable)}`;

  if (schema.anyOf) {
    return `Any properties in ${schema.anyOf
      .map((one) => getSchemaType(one, ctx, nullable))
      .filter((v) => v !== 'unknown')
      .join(', ')}`;
  }

  if (schema.type === 'string' && schema.format === 'binary' && ctx.allowFile)
    return 'file';

  if (schema.type) {
    if (
      !nullable &&
      (schema.type === 'null' ||
        (Array.isArray(schema.type) && schema.type.includes('null')))
    ) {
      return 'unknown';
    }

    return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type;
  }

  if (isObject(schema)) return 'object';

  return 'unknown';
}
