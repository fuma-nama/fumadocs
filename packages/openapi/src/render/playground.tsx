import type { ReactNode } from 'react';
import type {
  MethodInformation,
  ParameterObject,
  RenderContext,
} from '@/types';
import {
  getPreferredType,
  noRef,
  normalizeSchema,
  type ParsedSchema,
} from '@/utils/schema';
import { getSecurities } from '@/utils/get-security';

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
   * Reference to item schema or the schema
   */
  items: string | RequestSchema;
}

interface FileSchema extends BaseSchema {
  type: 'file';
}

interface ObjectSchema extends BaseSchema {
  type: 'object';
  properties: Record<string, ReferenceSchema>;

  /**
   * Reference to schema, or true if it's `any`
   */
  additionalProperties?: boolean | string;
}

interface SwitcherSchema extends BaseSchema {
  type: 'switcher';
  items: Record<string, ReferenceSchema | RequestSchema>;
}

interface NullSchema extends BaseSchema {
  type: 'null';
}

export type RequestSchema =
  | PrimitiveSchema
  | ArraySchema
  | ObjectSchema
  | SwitcherSchema
  | NullSchema
  | FileSchema;

interface Context {
  allowFile: boolean;
  schema: Record<string, RequestSchema>;
  registered: WeakMap<ParsedSchema, string>;
  nextId: () => string;
}

export interface APIPlaygroundProps {
  route: string;
  method: string;
  bodyType: 'json' | 'form-data';
  authorization?: PrimitiveRequestField & { authType: string };
  path?: PrimitiveRequestField[];
  query?: PrimitiveRequestField[];
  header?: PrimitiveRequestField[];
  body?: RequestSchema;
  schemas: Record<string, RequestSchema>;
}

export function Playground({
  path,
  method,
  ctx,
}: {
  path: string;
  method: MethodInformation;
  ctx: RenderContext;
}): ReactNode {
  let currentId = 0;
  const bodyContent = noRef(method.requestBody)?.content;
  const mediaType = bodyContent ? getPreferredType(bodyContent) : undefined;

  const context: Context = {
    allowFile: mediaType === 'multipart/form-data',
    schema: {},
    nextId() {
      return String(currentId++);
    },
    registered: new WeakMap(),
  };

  const props: APIPlaygroundProps = {
    authorization: getAuthorizationField(method, ctx),
    method: method.method,
    route: path,
    bodyType: mediaType === 'multipart/form-data' ? 'form-data' : 'json',
    path: method.parameters
      .filter((v) => v.in === 'path')
      .map((v) => parameterToField(v, context)),
    query: method.parameters
      .filter((v) => v.in === 'query')
      .map((v) => parameterToField(v, context)),
    header: method.parameters
      .filter((v) => v.in === 'header')
      .map((v) => parameterToField(v, context)),
    body:
      bodyContent && mediaType && bodyContent[mediaType].schema
        ? toSchema(noRef(bodyContent[mediaType].schema), true, context)
        : undefined,
    schemas: context.schema,
  };

  return <ctx.renderer.APIPlayground {...props} />;
}

function getAuthorizationField(
  method: MethodInformation,
  ctx: RenderContext,
): (PrimitiveRequestField & { authType: string }) | undefined {
  const security = method.security ?? ctx.document.security ?? [];
  if (security.length === 0) return;
  const singular = security.find(
    (requirements) => Object.keys(requirements).length === 1,
  );
  if (!singular) return;

  const scheme = getSecurities(singular, ctx.document)[0];

  return {
    type: 'string',
    name: scheme.type === 'apiKey' ? scheme.name : 'Authorization',
    authType: scheme.type,
    defaultValue:
      scheme.type === 'oauth2' ||
      (scheme.type === 'http' && scheme.scheme === 'bearer')
        ? 'Bearer'
        : 'Basic',
    isRequired: security.every(
      (requirements) => Object.keys(requirements).length > 0,
    ),
    description: 'The Authorization access token',
  };
}

function getIdFromSchema(
  schema: ParsedSchema,
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
  v: ParameterObject,
  ctx: Context,
): PrimitiveRequestField {
  return {
    name: v.name,
    ...(toSchema(
      normalizeSchema(noRef(v.schema) ?? { type: 'string' }),
      v.required ?? false,
      ctx,
    ) as PrimitiveSchema),
  };
}

function toReference(
  schema: ParsedSchema,
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
  schema: ParsedSchema,
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

    const additional = noRef(schema.additionalProperties);
    let additionalProperties: string | boolean | undefined;

    if (additional && typeof additional === 'object') {
      if (
        !additional.type &&
        !additional.anyOf &&
        !additional.allOf &&
        !additional.oneOf
      ) {
        additionalProperties = true;
      } else {
        additionalProperties = getIdFromSchema(additional, false, ctx);
      }
    } else {
      additionalProperties = additional;
    }

    return {
      type: 'object',
      isRequired: required,
      description: schema.description ?? schema.title,
      properties,
      additionalProperties,
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

  if (ctx.allowFile && schema.type === 'string' && schema.format === 'binary') {
    return {
      type: 'file',
      isRequired: required,
      description: schema.description ?? schema.title,
    };
  }

  if (Array.isArray(schema.type)) {
    const items: Record<string, RequestSchema> = {};

    for (const type of schema.type) {
      if (type === 'array') {
        items[type] = {
          type,
          items:
            'items' in schema && schema.items
              ? toSchema(schema.items, false, ctx)
              : toSchema({}, required, ctx),
          isRequired: required,
        };
      } else if (type !== 'null' && type !== 'object') {
        items[type] = {
          type: type === 'integer' ? 'number' : type,
          isRequired: required,
          defaultValue: schema.example ?? schema.default ?? '',
        };
      }
    }

    return {
      type: 'switcher',
      description: schema.description ?? schema.title,
      items,
      isRequired: required,
    };
  }

  return {
    type: schema.type === 'integer' ? 'number' : schema.type,
    defaultValue: (schema.example ?? '') as string,
    isRequired: required,
    description: schema.description ?? schema.title,
  };
}
