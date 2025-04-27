import type {
  MethodInformation,
  ParameterObject,
  RenderContext,
} from '@/types';
import {
  getPreferredType,
  type NoReference,
  type ParsedSchema,
} from '@/utils/schema';
import { getSecurities } from '@/utils/get-security';
import { type ClientProps } from './client';
import { ClientLazy } from '@/playground/client.lazy';

interface BaseSchema {
  description?: string;
  isRequired: boolean;
}

export type ParameterField = (PrimitiveSchema | ArraySchema) & {
  name: string;
  description?: string;
  in: 'cookie' | 'header' | 'query' | 'path';
};

interface PrimitiveSchema extends BaseSchema {
  type: 'boolean' | 'string' | 'number';
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
  properties: Record<string, RequestSchema | ReferenceSchema>;

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
  references: Record<string, RequestSchema>;
  registered: WeakMap<ParsedSchema, string>;
  nextId: () => string;
  render: RenderContext;
}

export interface APIPlaygroundProps {
  path: string;
  method: MethodInformation;
  ctx: RenderContext;

  client?: Partial<ClientProps>;
}

export type { ClientProps, CustomField } from './client';

export async function APIPlayground({
  path,
  method,
  ctx,
  client,
}: APIPlaygroundProps) {
  let currentId = 0;
  const bodyContent = method.requestBody?.content;
  const mediaType = bodyContent ? getPreferredType(bodyContent) : undefined;

  const context: Context = {
    allowFile: mediaType === 'multipart/form-data',
    references: {},
    nextId() {
      return String(currentId++);
    },
    registered: new WeakMap(),
    render: ctx,
  };

  const bodySchema =
    bodyContent && mediaType && bodyContent[mediaType].schema
      ? toSchema(bodyContent[mediaType].schema, true, context)
      : undefined;

  const props: ClientProps = {
    authorization: getAuthorizationField(method, ctx),
    method: method.method,
    route: path,
    parameters: method.parameters?.map((v) => parameterToField(v, context)),
    body:
      bodySchema && mediaType
        ? {
            ...bodySchema,
            mediaType: mediaType as string,
          }
        : undefined,
    references: context.references,
    proxyUrl: ctx.proxyUrl,
    ...client,
  };

  return <ClientLazy {...props} />;
}

function getAuthorizationField(
  method: MethodInformation,
  { schema: { document } }: RenderContext,
): ClientProps['authorization'] {
  const security = method.security ?? document.security ?? [];
  if (security.length === 0) return;

  let item;
  for (const requirements of security) {
    const keys = Object.keys(requirements).length;

    if (keys === 0) return;
    else if (keys === 1) item = requirements;
  }

  if (!item) {
    console.warn(
      `Cannot find suitable security schema for API Playground from ${JSON.stringify(security, null, 2)}. Only one requirement is allowed`,
    );
    return;
  }

  const scheme = getSecurities(item, document)[0];

  if (scheme.type === 'oauth2') {
    const flow = Object.keys(scheme.flows).at(0);
    if (!flow) throw new Error("security scheme's `flows` must not be empty");

    if (flow === 'implicit' || flow === 'password')
      throw new Error(
        `OAuth 2.0 flow type: ${flow} is not supported, consider other types like \`authorizationCode\` instead.`,
      );
  }

  return {
    persistentId: Object.keys(item)[0],
    ...scheme,
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
    ctx.references[id] = toSchema(schema, required, ctx);
    return id;
  }

  return registered;
}

function parameterToField(
  v: NoReference<ParameterObject>,
  ctx: Context,
): ParameterField {
  const allowed = ['header', 'cookie', 'query', 'path'] as const;

  if (!allowed.includes(v.in as (typeof allowed)[number]))
    throw new Error(`Unsupported parameter in: "${v.in}"`);

  return {
    name: v.name,
    in: v.in as (typeof allowed)[number],
    ...(toSchema(
      v.schema ?? { type: 'string' },
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
  schema: NoReference<ParsedSchema>,
  required: boolean,
  ctx: Context,
): RequestSchema {
  if (schema.type === 'array') {
    return {
      type: 'array',
      description: schema.description ?? schema.title,
      isRequired: required,
      items: getIdFromSchema(schema.items, false, ctx),
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
        prop,
        schema.required?.includes(key) ?? false,
        ctx,
      );
    });

    schema.allOf?.forEach((c) => {
      const field = toSchema(c, true, ctx);

      if (field.type === 'object') Object.assign(properties, field.properties);
    });

    const additional = schema.additionalProperties;
    let additionalProperties: string | boolean | undefined;

    if (additional && typeof additional === 'object') {
      if (
        (!additional.type || additional.type.length === 0) &&
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
          combine.map((item, idx) => {
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
      } else {
        items[type] = toSchema(
          {
            ...schema,
            type,
          },
          required,
          ctx,
        );
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
    isRequired: required,
    description: schema.description ?? schema.title,
  };
}
