import {
  execute,
  getNamedType,
  GraphQLError,
  isEnumType,
  isListType,
  isNonNullType,
  parse,
  specifiedRules,
  validate,
  type DocumentNode,
  type ValidationRule,
} from 'graphql';
import { graphql } from '@/lib/graphql';

/** Reject unreasonably large request bodies. */
const MaxBodySize = 100 * 1024;

/** Reject deeply nested documents to bound execution cost. */
const MaxDepth = 15;

function depthLimit(maxDepth: number): ValidationRule {
  return (context) => {
    let depth = 0;
    let reported = false;

    return {
      SelectionSet: {
        enter() {
          if (++depth > maxDepth && !reported) {
            reported = true;
            context.reportError(
              new GraphQLError(`Document exceeds the maximum depth of ${maxDepth}.`),
            );
          }
        },
        leave() {
          depth--;
        },
      },
    };
  };
}

/**
 * A mock GraphQL endpoint for the playground, it responds with sample values.
 *
 * Replace it with your own GraphQL server in a real app.
 */
export async function POST(req: Request) {
  const [{ schema }] = Object.values(await graphql.getSchemas());

  const raw = await req.text();
  if (raw.length > MaxBodySize) {
    return Response.json({ errors: [{ message: 'Request body too large.' }] }, { status: 413 });
  }

  let body: { query?: unknown; variables?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    body = {};
  }
  if (typeof body.query !== 'string') {
    return Response.json(
      { errors: [{ message: 'Expected a JSON body with a `query` string.' }] },
      { status: 400 },
    );
  }

  let document: DocumentNode;
  try {
    document = parse(body.query);
  } catch (error) {
    return Response.json({ errors: [error] }, { status: 400 });
  }

  const errors = validate(schema, document, [...specifiedRules, depthLimit(MaxDepth)]);
  if (errors.length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  const result = await execute({
    schema,
    document,
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
