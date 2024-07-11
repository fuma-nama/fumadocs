import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation, RenderContext } from '@/types';
import { getPreferredMedia, noRef } from '@/utils/schema';
import { getScheme } from '@/utils/get-security';

interface BaseRequestField {
  name: string;
  description?: string;
}

interface BaseSchema {
  description?: string;
  isRequired: boolean;
}

export type PrimitiveRequestField = BaseRequestField & PrimitiveSchema;

interface PrimitiveSchema extends BaseSchema {
  type: 'boolean' | 'string' | 'number';
  defaultValue: string;
}

export interface ReferenceSchema extends BaseSchema {
  type: 'ref';
  schema: string;
}

interface ArraySchema extends BaseSchema {
  type: 'array';
  /**
   * Reference to item schema
   */
  items: string;
}

interface ObjectSchema extends BaseSchema {
  type: 'object';
  properties: Record<string, ReferenceSchema>;
}

interface SwitcherSchema extends BaseSchema {
  type: 'switcher';
  items: Record<string, ReferenceSchema>;
}

interface NullSchema extends BaseSchema {
  type: 'null';
}

export type RequestSchema =
  | PrimitiveSchema
  | ArraySchema
  | ObjectSchema
  | SwitcherSchema
  | NullSchema;

interface Context {
  schema: Record<string, RequestSchema>;
  registered: WeakMap<OpenAPI.SchemaObject, string>;
  nextId: () => string;
}

export interface APIPlaygroundProps {
  route: string;
  method: string;
  authorization?: PrimitiveRequestField;
  path?: PrimitiveRequestField[];
  query?: PrimitiveRequestField[];
  header?: PrimitiveRequestField[];
  body?: RequestSchema;
  schemas: Record<string, RequestSchema>;
}

export function renderPlayground(
  path: string,
  method: MethodInformation,
  ctx: RenderContext,
): string {
  let currentId = 0;
  const context: Context = {
    schema: {},
    nextId() {
      return String(currentId++);
    },
    registered: new WeakMap(),
  };
  const security = method.security ?? ctx.document.security ?? [];
  const body = method.requestBody
    ? getPreferredMedia(noRef(method.requestBody).content)
    : undefined;

  return ctx.renderer.APIPlayground({
    authorization:
      security.length > 0
        ? {
            type: 'string',
            name: 'authorization',
            defaultValue: getScheme(security[0], ctx.document).some(
              (s) =>
                s.type === 'oauth2' ||
                (s.type === 'http' && s.scheme === 'bearer'),
            )
              ? 'Bearer'
              : 'Basic',
            isRequired: true,
            description: 'The authorization token',
          }
        : undefined,
    method: method.method,
    route: path,
    path: method.parameters
      .filter((v) => v.in === 'path')
      .map((v) => parameterToField(v, context)),
    query: method.parameters
      .filter((v) => v.in === 'query')
      .map((v) => parameterToField(v, context)),
    header: method.parameters
      .filter((v) => v.in === 'header')
      .map((v) => parameterToField(v, context)),
    body: body?.schema
      ? toSchema(noRef(body.schema), true, context)
      : undefined,
    schemas: context.schema,
  });
}

function getIdFromSchema(
  schema: OpenAPI.SchemaObject,
  required: boolean,
  ctx: Context,
): string {
  const registered = ctx.registered.get(schema);

  if (registered === undefined) {
    const id = ctx.nextId();
    ctx.registered.set(schema, id);
    ctx.schema[id] = toSchema(schema, required, ctx);
    return id;
  }

  return registered;
}

function parameterToField(
  v: OpenAPI.ParameterObject,
  ctx: Context,
): PrimitiveRequestField {
  return {
    name: v.name,
    ...(toSchema(
      noRef(v.schema) ?? { type: 'string' },
      v.required ?? false,
      ctx,
    ) as PrimitiveSchema),
  };
}

function toReference(
  schema: OpenAPI.SchemaObject,
  required: boolean,
  ctx: Context,
): ReferenceSchema {
  return {
    type: 'ref',
    isRequired: required,
    schema: getIdFromSchema(schema, false, ctx),
  };
}

function toSchema(
  schema: OpenAPI.SchemaObject,
  required: boolean,
  ctx: Context,
): RequestSchema {
  if (schema.type === 'array') {
    return {
      type: 'array',
      description: schema.description ?? schema.title,
      isRequired: required,
      items: getIdFromSchema(noRef(schema.items), false, ctx),
    };
  }

  if (
    schema.type === 'object' ||
    schema.properties !== undefined ||
    schema.allOf !== undefined
  ) {
    const properties: Record<string, ReferenceSchema> = {};

    Object.entries(schema.properties ?? {}).forEach(([key, prop]) => {
      properties[key] = toReference(
        noRef(prop),
        schema.required?.includes(key) ?? false,
        ctx,
      );
    });

    schema.allOf?.forEach((c) => {
      const field = toSchema(noRef(c), true, ctx);

      if (field.type === 'object') Object.assign(properties, field.properties);
    });

    return {
      type: 'object',
      isRequired: required,
      description: schema.description ?? schema.title,
      properties,
    };
  }

  if (schema.type === undefined) {
    const combine = schema.anyOf ?? schema.oneOf;

    if (combine) {
      return {
        type: 'switcher',
        description: schema.description ?? schema.title,
        items: Object.fromEntries(
          combine.map((c, idx) => {
            const item = noRef(c);

            return [
              item.title ?? item.type ?? `Item ${idx.toString()}`,
              toReference(item, true, ctx),
            ];
          }),
        ),
        isRequired: required,
      };
    }

    return {
      type: 'null',
      isRequired: false,
    };
  }

  return {
    type: schema.type === 'integer' ? 'number' : schema.type,
    defaultValue: (schema.example ?? '') as string,
    isRequired: required,
    description: schema.description ?? schema.title,
  };
}
