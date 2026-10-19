import {
  assertEnumType,
  execute,
  getNamedType,
  getOperationAST,
  GraphQLError,
  isEnumType,
  isListType,
  isNonNullType,
  parse,
  specifiedRules,
  subscribe,
  validate,
  type DocumentNode,
  type ExecutionArgs,
  type ExecutionResult,
  type GraphQLSchema,
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

/** The events of `orderUpdated`: the order goes through every status, half a second apart. */
async function* orderUpdates(schema: GraphQLSchema, signal: AbortSignal) {
  for (const { name } of assertEnumType(schema.getType('OrderStatus')).getValues()) {
    if (signal.aborted) return;
    yield { orderUpdated: { status: name } };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Stream the results of a subscription with the GraphQL over SSE protocol. */
function eventStream(results: AsyncIterable<ExecutionResult>, signal: AbortSignal) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const result of results) {
        controller.enqueue(encoder.encode(`event: next\ndata: ${JSON.stringify(result)}\n\n`));
      }

      // the stream is canceled already when the client disconnected
      if (signal.aborted) return;
      controller.enqueue(encoder.encode('event: complete\ndata:\n\n'));
      controller.close();
    },
  });
}

/**
 * A mock GraphQL endpoint for the playground, it responds with sample values.
 * Subscriptions are streamed with Server-Sent Events.
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

  const args: ExecutionArgs = {
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
    typeResolver: (_value, _ctx, info, type) => info.schema.getPossibleTypes(type)[0]?.name,
  };

  if (getOperationAST(document)?.operation === 'subscription') {
    const result = await subscribe({
      ...args,
      subscribeFieldResolver: () => orderUpdates(schema, req.signal),
    });
    // errors before the first event, like invalid variables, are a single result
    if (!(Symbol.asyncIterator in result)) return Response.json(result);

    return new Response(eventStream(result, req.signal), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  return Response.json(await execute(args));
}
