import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation, RenderContext } from '@/types';
import { getPreferredMedia, noRef } from '@/utils/schema';

interface BaseRequestField {
  name?: string;
  description?: string;
  isRequired: boolean;
}

type PrimitiveRequestField = BaseRequestField & {
  type: 'boolean' | 'string' | 'number';
  defaultValue: string;
};

type ArrayRequestField = BaseRequestField & {
  type: 'array';
  items: RequestField;
};

type ObjectRequestField = BaseRequestField & {
  type: 'object';
  properties: RequestField[];
};

interface Switcher extends BaseRequestField {
  type: 'switcher';
  items: RequestField[];
}

interface NullField extends BaseRequestField {
  type: 'null';
}

interface Context {
  stack: OpenAPI.SchemaObject[];
}

export type RequestField =
  | ArrayRequestField
  | PrimitiveRequestField
  | NullField
  | ObjectRequestField
  | Switcher;

export interface APIPlaygroundProps {
  route: string;
  method: string;
  authorization?: PrimitiveRequestField;
  path?: PrimitiveRequestField[];
  query?: PrimitiveRequestField[];
  header?: PrimitiveRequestField[];
  body?: RequestField;
}

export function renderPlayground(
  path: string,
  method: MethodInformation,
  ctx: RenderContext,
): string {
  const security = method.security ?? ctx.document.security;
  const body = method.requestBody
    ? getPreferredMedia(noRef(method.requestBody).content)
    : undefined;

  return ctx.renderer.APIPlayground({
    authorization: security
      ? {
          type: 'string',
          name: 'authorization',
          defaultValue: 'Bearer',
          isRequired: true,
          description: 'The authorization token',
        }
      : undefined,
    method: method.method,
    route: path,
    path: method.parameters
      .filter((v) => v.in === 'path')
      .map((v) =>
        schemaToField(
          noRef(v.schema ?? { type: 'string' }),
          v.name,
          v.required ?? false,
        ),
      ) as PrimitiveRequestField[],
    query: method.parameters
      .filter((v) => v.in === 'query')
      .map((v) =>
        schemaToField(
          noRef(v.schema ?? { type: 'string' }),
          v.name,
          v.required ?? false,
        ),
      ) as PrimitiveRequestField[],
    header: method.parameters
      .filter((v) => v.in === 'header')
      .map((v) =>
        schemaToField(
          noRef(v.schema ?? { type: 'string' }),
          v.name,
          v.required ?? false,
        ),
      ) as PrimitiveRequestField[],
    body: body?.schema
      ? schemaToField(noRef(body.schema), 'body', false)
      : undefined,
  });
}

function schemaToField(
  schema: OpenAPI.SchemaObject,
  name: string | undefined,
  required: boolean,
  ctx: Context = { stack: [] },
): RequestField {
  // TODO: Implement logic to handle self-referencing types
  if (ctx.stack.includes(schema)) return { type: 'null', isRequired: false };

  ctx.stack = [...ctx.stack, schema];

  if (schema.type === 'array') {
    return {
      type: 'array',
      isRequired: required,
      name,
      description: schema.description ?? schema.title,
      items: schemaToField(noRef(schema.items), undefined, false, ctx),
    };
  }

  if (
    schema.type === 'object' ||
    schema.properties !== undefined ||
    schema.allOf !== undefined
  ) {
    const properties: RequestField[] = [];

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, prop]) =>
        properties.push(
          schemaToField(
            noRef(prop),
            key,
            schema.required?.includes(key) ?? false,
            ctx,
          ),
        ),
      );
    }

    schema.allOf?.forEach((c) => {
      const field = schemaToField(noRef(c), undefined, true, ctx);

      if (field.type === 'object') properties.push(...field.properties);
    });

    return {
      type: 'object',
      isRequired: required,
      name,
      description: schema.description ?? schema.title,
      properties,
    };
  }

  if (schema.type === undefined) {
    const combine = schema.anyOf ?? schema.oneOf;

    if (combine) {
      return {
        type: 'switcher',
        name,
        description: schema.description ?? schema.title,
        items: combine.map((c) =>
          schemaToField(noRef(c), undefined, true, ctx),
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
    name,
    description: schema.description ?? schema.title,
  };
}
