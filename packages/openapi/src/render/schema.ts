import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { noRef } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { p, span } from './element';

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
   */
  allowFile: boolean;

  stack: OpenAPI.SchemaObject[];

  render: RenderContext;
}

function isObject(schema: OpenAPI.SchemaObject): boolean {
  return (
    schema.type === 'object' ||
    schema.properties !== undefined ||
    schema.additionalProperties !== undefined
  );
}

export function schemaElement(
  name: string,
  schema: OpenAPI.SchemaObject,
  ctx: Omit<Context, 'stack'>,
): string {
  return render(name, schema, {
    ...ctx,
    stack: [],
  });
}

function render(
  name: string,
  schema: OpenAPI.SchemaObject,
  ctx: Context,
): string {
  if (schema.readOnly && !ctx.readOnly) return '';
  if (schema.writeOnly && !ctx.writeOnly) return '';
  const { renderer } = ctx.render;

  const child: string[] = [];

  function field(key: string, value: string): void {
    child.push(span(`${key}: \`${value}\``));
  }

  // object type
  if (isObject(schema) && ctx.parseObject) {
    const { additionalProperties, properties } = schema;

    if (additionalProperties === true) {
      child.push(
        renderer.Property(
          {
            name: '[key: string]',
            type: 'any',
          },
          [],
        ),
      );
    } else if (additionalProperties) {
      child.push(
        render('[key: string]', noRef(additionalProperties), {
          ...ctx,
          required: false,
          parseObject: false,
        }),
      );
    }

    Object.entries(properties ?? {}).forEach(([key, value]) => {
      child.push(
        render(key, noRef(value), {
          ...ctx,
          required: schema.required?.includes(key) ?? false,
          parseObject: false,
        }),
      );
    });

    return child.join('\n\n');
  }

  child.push(p(schema.description));
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
      renderer.ObjectCollapsible({ name }, [
        render(name, schema, {
          ...ctx,
          parseObject: true,
          required: false,
        }),
      ]),
    );
  } else if (schema.allOf) {
    child.push(
      renderer.ObjectCollapsible({ name }, [
        render(name, combineSchema(schema.allOf.map(noRef)), {
          ...ctx,
          parseObject: true,
          required: false,
        }),
      ]),
    );
  } else {
    const mentionedObjectTypes = [
      ...(schema.anyOf ?? schema.oneOf ?? []),
      ...(schema.not ? [schema.not] : []),
      ...(schema.type === 'array' ? [schema.items] : []),
    ]
      .map(noRef)
      .filter((s) => isComplexType(s) && !ctx.stack.includes(s));

    ctx.stack.push(schema);
    child.push(
      ...mentionedObjectTypes.map((s, idx) =>
        renderer.ObjectCollapsible(
          { name: s.title ?? `Object ${(idx + 1).toString()}` },
          [
            render('element', noRef(s), {
              ...ctx,
              parseObject: true,
              required: false,
            }),
          ],
        ),
      ),
    );
    ctx.stack.pop();
  }

  return renderer.Property(
    {
      name,
      type: getSchemaType(schema, ctx),
      required: ctx.required,
      deprecated: schema.deprecated,
    },
    child,
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
