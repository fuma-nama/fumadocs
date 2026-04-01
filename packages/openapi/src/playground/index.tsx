import type {
  MediaTypeObject,
  MethodInformation,
  ParameterObject,
  RenderContext,
  SecuritySchemeObject,
} from '@/types';
import { getPreferredType, NoReference, type ParsedSchema } from '@/utils/schema';
import { type PlaygroundClientProps } from './client';

interface Context {
  references: Record<string, ParsedSchema>;
  registered: WeakMap<Exclude<ParsedSchema, boolean>, string>;
  id: (schema?: object) => string;
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

export function APIPlayground({ path, method, ctx }: APIPlaygroundProps) {
  if (ctx.playground?.render) {
    return ctx.playground.render({ path, method, ctx });
  }

  const bodyContent = method.requestBody?.content;
  const mediaType = bodyContent ? getPreferredType(bodyContent) : undefined;
  const takenIds = new Map<string, number>();

  const context: Context = {
    references: {},
    id(schema) {
      let name = 'r';
      if (schema) {
        const ref = ctx.schema.getRawRef(schema)?.split('/');
        if (ref && ref.length > 0) name = ref[ref.length - 1];
      }

      const count = takenIds.get(name) ?? 0;
      takenIds.set(name, count + 1);
      return count === 0 ? name : `${name}${count}`;
    },
    registered: new WeakMap(),
  };

  const props: PlaygroundClientProps = {
    securities: parseSecurities(method, ctx),
    method: method.method,
    route: path,
    parameters: method.parameters?.map((param: NoReference<ParameterObject>): ParameterObject => {
      if (param.schema !== undefined) {
        return {
          ...param,
          schema: writeReferences(param.schema, context),
        } as ParameterObject;
      }

      if (param.content !== undefined) {
        const content: Record<string, MediaTypeObject> = {};

        for (const k in param.content) {
          const original = param.content[k] as NoReference<MediaTypeObject>;
          if (!original || original.schema === undefined) continue;

          content[k] = {
            ...original,
            schema: writeReferences(original.schema, context),
          } as MediaTypeObject;
        }

        return {
          ...param,
          content,
        } as ParameterObject;
      }

      return param;
    }),
    body:
      bodyContent && mediaType
        ? ({
            schema: writeReferences(bodyContent[mediaType].schema as ParsedSchema, context),
            mediaType,
          } as PlaygroundClientProps['body'])
        : undefined,
    references: context.references,
    proxyUrl: ctx.proxyUrl,
    writeOnly: true,
    readOnly: false,
  };

  return <ctx.clientBoundary.PlaygroundClient {...props} />;
}

function writeReferences(
  schema: ParsedSchema,
  ctx: Context,
  stack: WeakMap<object, object> = new WeakMap(),
): ParsedSchema {
  if (typeof schema !== 'object' || !schema) return schema;
  if (stack.has(schema)) {
    const out = stack.get(schema)!;
    const id = ctx.id(schema);
    ctx.references[id] = out;

    return {
      $ref: `#/${id}`,
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
        output[name] = output[name].map((item) => writeReferences(item, ctx, stack));
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
