import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { ReactNode } from 'react';
import { noRef } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { Markdown } from './markdown';

const keys: {
  [T in keyof OpenAPI.SchemaObject]: string;
} = {
  example: 'Example',
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

  /** Render the full object */
  parseObject: boolean;

  /**
   * Parse binary format string to be files
   *
   * @defaultValue false
   */
  allowFile?: boolean;

  stack?: OpenAPI.SchemaObject[];

  render: RenderContext;
}

function isObject(schema: OpenAPI.SchemaObject): boolean {
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
  schema: OpenAPI.SchemaObject;
  ctx: Context;
}): ReactNode {
  if (
    (schema.readOnly === true && !ctx.readOnly) ||
    (schema.writeOnly === true && !ctx.writeOnly)
  )
    return null;
  ctx.allowFile ??= true;
  const stack = ctx.stack ?? [];

  const { renderer } = ctx.render;
  const child: ReactNode[] = [];

  function field(key: string, value: string): void {
    child.push(
      <span key={key}>
        {key}: <code>{value}</code>
      </span>,
    );
  }

  // object type
  if (isObject(schema) && ctx.parseObject) {
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
          schema={noRef(additionalProperties)}
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
            schema={noRef(value)}
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

  if (schema.description)
    child.push(<Markdown key="description" text={schema.description} />);
  for (const [key, value] of Object.entries(keys)) {
    if (key in schema) {
      field(value, JSON.stringify(schema[key as keyof OpenAPI.SchemaObject]));
    }
  }

  // enum types
  if (schema.enum) {
    field(
      'Value in',
      schema.enum.map((value) => JSON.stringify(value)).join(' | '),
    );
  }

  if (isObject(schema) && !ctx.parseObject) {
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
  } else if (schema.allOf) {
    child.push(
      <renderer.ObjectCollapsible key="attributes" name={name}>
        <Schema
          name={name}
          schema={combineSchema(schema.allOf.map(noRef))}
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
    ]
      .map(noRef)
      .filter((s) => isComplexType(s) && !stack.includes(s));

    const renderedMentionedTypes = mentionedObjectTypes.map((s, idx) => {
      return (
        <renderer.ObjectCollapsible
          key={`mentioned:${idx.toString()}`}
          name={s.title ?? `Object ${(idx + 1).toString()}`}
        >
          <Schema
            name="element"
            schema={noRef(s)}
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
      deprecated={schema.deprecated}
    >
      {child}
    </renderer.Property>
  );
}

/**
 * Combine multiple object schemas into one
 */
function combineSchema(schema: OpenAPI.SchemaObject[]): OpenAPI.SchemaObject {
  const result: OpenAPI.SchemaObject = {
    type: 'object',
  };

  function add(s: OpenAPI.SchemaObject): void {
    result.properties ??= {};

    if (s.properties) {
      Object.assign(result.properties, s.properties);
    }

    result.additionalProperties ??= {};
    if (s.additionalProperties === true) {
      result.additionalProperties = true;
    } else if (
      s.additionalProperties &&
      typeof result.additionalProperties !== 'boolean'
    ) {
      Object.assign(result.additionalProperties, s.additionalProperties);
    }

    if (s.allOf) {
      add(combineSchema(s.allOf.map(noRef)));
    }
  }

  schema.forEach(add);

  return result;
}

/**
 * Check if the schema needs another collapsible to explain
 */
function isComplexType(schema: OpenAPI.SchemaObject): boolean {
  if (schema.anyOf ?? schema.oneOf ?? schema.allOf) return true;

  return isObject(schema) || schema.type === 'array';
}

function getSchemaType(schema: OpenAPI.SchemaObject, ctx: Context): string {
  if (schema.nullable) {
    const type = getSchemaType({ ...schema, nullable: false }, ctx);

    // null if schema only contains `nullable`
    return type === 'unknown' ? 'null' : `${type} | null`;
  }

  if (schema.title) return schema.title;

  if (schema.type === 'array')
    return `array<${getSchemaType(noRef(schema.items), ctx)}>`;

  if (schema.oneOf)
    return schema.oneOf
      .map((one) => getSchemaType(noRef(one), ctx))
      .join(' | ');

  if (schema.allOf)
    return schema.allOf
      .map((one) => getSchemaType(noRef(one), ctx))
      .join(' & ');

  if (schema.not) return `not ${getSchemaType(noRef(schema.not), ctx)}`;

  if (schema.anyOf) {
    return `Any properties in ${schema.anyOf
      .map((one) => getSchemaType(noRef(one), ctx))
      .join(', ')}`;
  }

  if (schema.type === 'string' && schema.format === 'binary' && ctx.allowFile)
    return 'File';
  if (schema.type) return schema.type;

  if (isObject(schema)) return 'object';

  return 'unknown';
}
