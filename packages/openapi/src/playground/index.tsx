import type {
  MethodInformation,
  ParameterObject,
  RenderContext,
  SecuritySchemeObject,
} from '@/types';
import {
  getPreferredType,
  type NoReference,
  type ParsedSchema,
} from '@/utils/schema';
import { type PlaygroundClientProps } from './client';
import { ClientLazy } from './lazy';

export type ParameterField = NoReference<ParameterObject> & {
  schema: ParsedSchema;
  in: 'cookie' | 'header' | 'query' | 'path';
};

export type RequestSchema = ParsedSchema;

interface Context {
  references: Record<string, RequestSchema>;
  registered: WeakMap<Exclude<ParsedSchema, boolean>, string>;
  nextId: () => string;
}

export interface APIPlaygroundProps {
  path: string;
  method: MethodInformation;
  ctx: RenderContext;
}

export type SecurityEntry = SecuritySchemeObject & {
  scopes: string[];
  id: string;
};

export async function APIPlayground({ path, method, ctx }: APIPlaygroundProps) {
  if (ctx.playground?.render) {
    return ctx.playground.render({ path, method, ctx });
  }

  let currentId = 0;
  const bodyContent = method.requestBody?.content;
  const mediaType = bodyContent ? getPreferredType(bodyContent) : undefined;

  const context: Context = {
    references: {},
    nextId() {
      return String(currentId++);
    },
    registered: new WeakMap(),
  };

  const props: PlaygroundClientProps = {
    securities: parseSecurities(method, ctx),
    method: method.method,
    route: path,
    parameters: method.parameters as ParameterField[],
    body:
      bodyContent && mediaType
        ? ({
            schema: writeReferences(
              bodyContent[mediaType].schema as ParsedSchema,
              context,
            ),
            mediaType,
          } as PlaygroundClientProps['body'])
        : undefined,
    references: context.references,
    proxyUrl: ctx.proxyUrl,
  };

  return <ClientLazy {...props} />;
}

function writeReferences(
  schema: ParsedSchema,
  ctx: Context,
  stack: WeakMap<object, object> = new WeakMap(),
): RequestSchema {
  if (typeof schema !== 'object' || !schema) return schema;
  if (stack.has(schema)) {
    const out = stack.get(schema)!;
    const id = ctx.nextId();
    ctx.references[id] = out;

    return {
      $ref: id,
    };
  }

  const output = { ...schema };
  stack.set(schema, output);
  for (const _n in output) {
    const name = _n as keyof typeof output;
    if (!output[name]) continue;

    switch (name) {
      case 'oneOf':
      case 'allOf':
      case 'anyOf':
        output[name] = output[name].map((item) =>
          writeReferences(item, ctx, stack),
        );
        continue;
      case 'items':
      case 'additionalProperties':
      case 'not':
        output[name] = writeReferences(output[name], ctx, stack);
        continue;
      case 'properties':
      case 'patternProperties':
        output[name] = { ...output[name] };

        for (const key in output[name]) {
          output[name][key] = writeReferences(output[name][key], ctx, stack);
        }
    }
  }

  return output;
}

function parseSecurities(
  method: MethodInformation,
  { schema: { dereferenced } }: RenderContext,
): PlaygroundClientProps['securities'] {
  const result: PlaygroundClientProps['securities'] = [];
  const security = method.security ?? dereferenced.security ?? [];
  if (security.length === 0) return result;

  for (const map of security) {
    const list: PlaygroundClientProps['securities'][number] = [];

    for (const [key, scopes] of Object.entries(map)) {
      const scheme = dereferenced.components?.securitySchemes?.[key];
      if (!scheme) continue;

      list.push({
        ...scheme,
        scopes,
        id: key,
      });
    }

    if (list.length > 0) result.push(list);
  }

  return result;
}
