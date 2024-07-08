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

  /** Parse object */
  parseObject: boolean;

  render: RenderContext;
}

function isObject(schema: OpenAPI.SchemaObject): boolean {
  return schema.type === 'object' || schema.properties !== undefined;
}

export function schemaElement(
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
        schemaElement('[key: string]', noRef(additionalProperties), {
          ...ctx,
          required: false,
          parseObject: false,
        }),
      );
    }

    Object.entries(properties ?? {}).forEach(([key, value]) => {
      child.push(
        schemaElement(key, noRef(value), {
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

  const mentionedObjectTypes = [
    ...(schema.anyOf ?? schema.oneOf ?? schema.allOf ?? []),
    ...(schema.type === 'array' ? [schema.items] : []),
  ]
    .map(noRef)
    .filter((s) => isObject(s));

  child.push(
    ...mentionedObjectTypes.map((s, idx) =>
      renderer.ObjectCollapsible(
        { name: s.title ?? `Object ${(idx + 1).toString()}` },
        [
          schemaElement('element', noRef(s), {
            ...ctx,
            parseObject: true,
            required: false,
          }),
        ],
      ),
    ),
  );

  if (isObject(schema) && !ctx.parseObject) {
    child.push(
      renderer.ObjectCollapsible({ name }, [
        schemaElement(name, schema, {
          ...ctx,
          parseObject: true,
          required: false,
        }),
      ]),
    );
  }

  return renderer.Property(
    {
      name,
      type: getSchemaType(schema),
      required: ctx.required,
      deprecated: schema.deprecated,
    },
    child,
  );
}

function getSchemaType(schema: OpenAPI.SchemaObject): string {
  if (schema.title) return schema.title;

  if (schema.nullable) {
    const type = getSchemaType({ ...schema, nullable: false });

    // null if schema only contains `nullable`
    return type === 'unknown' ? 'null' : `${type} | null`;
  }

  if (schema.type === 'array')
    return `array of ${getSchemaType(noRef(schema.items))}`;

  if (schema.oneOf)
    return schema.oneOf.map((one) => getSchemaType(noRef(one))).join(' | ');

  if (schema.allOf)
    return schema.allOf.map((one) => getSchemaType(noRef(one))).join(' & ');

  if (schema.not) return `not ${getSchemaType(noRef(schema.not))}`;

  if (schema.anyOf) {
    return `Any properties in ${schema.anyOf
      .map((one) => getSchemaType(noRef(one)))
      .join(', ')}`;
  }

  if (schema.type) return schema.type;

  // object without specified type
  if (isObject(schema)) return 'object';

  return 'unknown';
}
