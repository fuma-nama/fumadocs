import type { MethodInformation, RenderContext } from '@/types';
import { getPreferredType, type ParsedSchema } from '@/utils/schema';
import { getSecurities } from '@/utils/get-security';
import { type ClientProps } from './client';
import { ClientLazy } from '@/ui/lazy';

export type ParameterField = {
  name: string;
  description?: string;
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
    references: {},
    nextId() {
      return String(currentId++);
    },
    registered: new WeakMap(),
  };

  const props: ClientProps = {
    authorization: getAuthorizationField(method, ctx),
    method: method.method,
    route: path,
    parameters: method.parameters?.map((v) => ({
      name: v.name,
      in: v.in as ParameterField['in'],
      schema: writeReferences((v.schema ?? true) as ParsedSchema, context),
      description: v.description,
    })),
    body:
      bodyContent && mediaType
        ? ({
            schema: writeReferences(
              bodyContent[mediaType].schema as ParsedSchema,
              context,
            ),
            mediaType,
          } as ClientProps['body'])
        : undefined,
    references: context.references,
    proxyUrl: ctx.proxyUrl,
    ...client,
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

  for (const name of ['items', 'additionalProperties'] as const) {
    if (!output[name]) continue;
    output[name] = writeReferences(output[name], ctx, stack);
  }

  for (const name of ['oneOf', 'allOf', 'anyOf'] as const) {
    if (!output[name]) continue;
    output[name] = output[name].map((item) =>
      writeReferences(item, ctx, stack),
    );
  }

  for (const name of ['properties', 'patternProperties'] as const) {
    if (!output[name]) continue;
    output[name] = { ...output[name] };

    for (const key in output[name]) {
      output[name][key] = writeReferences(output[name][key], ctx, stack);
    }
  }

  return output;
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
