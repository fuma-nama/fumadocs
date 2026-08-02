import {
  graphql as execute,
  getNamedType,
  isEnumType,
  isListType,
  isNonNullType,
} from 'graphql';
import { graphql } from '@/lib/graphql';

/**
 * A mock GraphQL endpoint for the playground, it responds with sample values.
 *
 * Replace it with your own GraphQL server in a real app.
 */
export async function POST(req: Request) {
  const [{ schema }] = Object.values(await graphql.getSchemas());
  const body = (await req.json()) as { query: string; variables?: Record<string, unknown> };

  const result = await execute({
    schema,
    source: body.query,
    variableValues: body.variables,
    fieldResolver(source: Record<string, unknown> | undefined, _args, _ctx, info) {
      if (source && info.fieldName in source) return source[info.fieldName];

      let type = info.returnType;
      if (isNonNullType(type)) type = type.ofType;
      const named = getNamedType(type);
      const sample = isEnumType(named)
        ? named.getValues()[0]?.name
        : ({
            ID: '1',
            String: 'string',
            Int: 10,
            Float: 10.5,
            Boolean: true,
            DateTime: new Date(0).toISOString(),
          }[named.name] ?? {});

      return isListType(type) ? [sample] : sample;
    },
  });

  return Response.json(result);
}
