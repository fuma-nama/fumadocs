import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  assertEnumType,
  assertInputObjectType,
  assertScalarType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { type JsonSchema, sample, stringify } from '@fumadocs/json-schema';
import { StfProvider, useStf } from '@fumari/stf';
import { FieldRows } from 'shared-api/components/playground/fields';
import { SchemaProvider } from 'shared-api/components/playground/schema';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { executeGraphQL } from '@/playground/fetcher';
import { inputTypeToJsonSchema } from '@/playground/json-schema';
import { getEndpointOrigin, parseStoredState } from '@/playground/storage';
import { syncOperationVariables } from '@/playground/variables';
import { generateOperationExample } from '@/utils/example';
import { getOperationField } from '@/utils/schema';
import { getResponseErrors } from '@/ui/playground/errors';
import { toRequestValues } from '@/ui/playground/use-playground';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

describe('playground storage', () => {
  test('parses headers by origin', () => {
    expect(
      parseStoredState(
        JSON.stringify({
          url: 'https://api.example.com/graphql',
          headers: {
            'https://api.example.com': { Authorization: 'Bearer x' },
          },
        }),
      ),
    ).toEqual({
      url: 'https://api.example.com/graphql',
      headers: {
        'https://api.example.com': { Authorization: 'Bearer x' },
      },
    });
  });

  test('drops the old shape of header rows', () => {
    expect(
      parseStoredState(
        JSON.stringify({
          headers: {
            'https://api.example.com': [{ key: 'Authorization', value: 'Bearer x' }],
          },
        }),
      ),
    ).toEqual({ headers: {} });

    expect(
      parseStoredState(
        JSON.stringify({
          url: 'https://api.example.com/graphql',
          headers: [{ key: 'Authorization', value: 'Bearer x' }],
        }),
      ),
    ).toEqual({ url: 'https://api.example.com/graphql' });
  });

  test('rejects malformed content', () => {
    expect(parseStoredState(null)).toEqual({});
    expect(parseStoredState('')).toEqual({});
    expect(parseStoredState('not json')).toEqual({});
    expect(parseStoredState('"text"')).toEqual({});
    expect(parseStoredState('[1,2]')).toEqual({});
    expect(parseStoredState(JSON.stringify({ url: 10, headers: 'nope' }))).toEqual({});
  });

  test('filters invalid header values', () => {
    const state = parseStoredState(
      `{"headers":{"https://api.example.com":{"valid":"yes","count":1,"empty":null,"nested":{}},"https://other.example.com":"nope","__proto__":{"polluted":"yes"}}}`,
    );

    expect(state.headers?.['https://api.example.com']).toEqual({ valid: 'yes' });
    expect(Object.keys(state.headers!)).toEqual(['https://api.example.com', '__proto__']);
    // an own property, the prototype stays untouched
    expect(Object.getPrototypeOf(state.headers)).toBe(Object.prototype);
  });

  test('getEndpointOrigin', () => {
    expect(getEndpointOrigin('https://api.example.com/graphql')).toBe('https://api.example.com');
    expect(getEndpointOrigin('http://localhost:4000/api/graphql')).toBe('http://localhost:4000');
    // the default subscription URL of an endpoint
    expect(getEndpointOrigin('wss://api.example.com/graphql')).toBe('https://api.example.com');
    expect(getEndpointOrigin('ws://localhost:4000/graphql')).toBe('http://localhost:4000');
    // relative URLs resolve against the given base (`window.location.origin` in browsers)
    expect(getEndpointOrigin('/graphql', 'http://localhost:3000')).toBe('http://localhost:3000');
    // invalid URLs
    expect(getEndpointOrigin('not a url')).toBeUndefined();
    expect(getEndpointOrigin('')).toBeUndefined();
  });
});

describe('executeGraphQL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns the response with its headers', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{"data":{"ok":true}}', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'abc' },
        }),
    );
    vi.stubGlobal('fetch', fetch);

    const result = await executeGraphQL({
      url: 'https://api.example.com/graphql',
      query: '{ ok }',
      variables: { id: '1' },
      headers: { Authorization: 'Bearer x' },
    });

    expect(result).toMatchObject({
      type: 'response',
      status: 200,
      body: '{"data":{"ok":true}}',
      contentType: 'application/json',
      headers: [
        ['content-type', 'application/json'],
        ['x-request-id', 'abc'],
      ],
    });
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/graphql-response+json, application/json',
        Authorization: 'Bearer x',
      },
      body: '{"query":"{ ok }","variables":{"id":"1"}}',
    });
  });

  test('reports network errors as client errors', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    expect(
      await executeGraphQL({
        url: 'https://api.example.com/graphql',
        query: '{ ok }',
        headers: {},
      }),
    ).toEqual({ type: 'client_error', message: 'Failed to fetch' });
  });
});

describe('request values', () => {
  test('leaves out unset values and empty variables', () => {
    const data = { variables: { id: '1', filter: undefined }, headers: { 'X-Empty': undefined } };
    expect(toRequestValues(JSON.stringify(data))).toEqual({
      variables: { id: '1' },
      headers: {},
    });

    expect(
      toRequestValues(JSON.stringify({ variables: { filter: undefined }, headers: { a: 'b' } })),
    ).toEqual({ variables: undefined, headers: { a: 'b' } });
  });

  test('keeps variables edited as JSON that are not objects', () => {
    expect(toRequestValues(JSON.stringify({ variables: [], headers: {} }))).toEqual({
      variables: [],
      headers: {},
    });
  });
});

describe('getResponseErrors', () => {
  test('reads message, path and location', () => {
    expect(
      getResponseErrors({
        data: { customer: null },
        errors: [
          {
            message: 'Cannot return null for non-nullable field Order.total.',
            path: ['customer', 'orders', 0, 'total'],
            locations: [{ line: 3, column: 5 }],
          },
          { message: 'Unauthorized' },
        ],
      }),
    ).toEqual([
      {
        message: 'Cannot return null for non-nullable field Order.total.',
        path: 'customer.orders.0.total',
        location: '3:5',
      },
      { message: 'Unauthorized' },
    ]);
  });

  test('ignores bodies without errors', () => {
    expect(getResponseErrors({ data: {} })).toEqual([]);
    expect(getResponseErrors('text')).toEqual([]);
    expect(getResponseErrors({ errors: 'nope' })).toEqual([]);
    expect(getResponseErrors({ errors: [null, { message: 1 }] })).toEqual([{ message: '1' }]);
  });
});

describe('syncOperationVariables', () => {
  // `orders(filter: OrderFilter)`: every argument is optional
  const orders = getOperationField(schema, 'query', 'orders')!;
  const example = generateOperationExample(schema, { kind: 'query', name: 'orders' })!;

  /** what the send path does: declare what's set, never touch anything else */
  function declare(query: string, set: string[]) {
    return syncOperationVariables(query, orders, (name) => set.includes(name));
  }

  /** what unsetting an argument does: declare what's set, undeclare what isn't */
  function prune(query: string, set: string[]) {
    return syncOperationVariables(query, orders, (name) => set.includes(name), { prune: true });
  }

  test('declares an optional argument once it is set', () => {
    // the generated example only declares required arguments
    expect(example.query).not.toContain('$filter');

    const synced = declare(example.query, ['filter']);
    expect(synced).toContain('query Orders($filter: OrderFilter) {');
    expect(synced).toContain('orders(filter: $filter) {');
  });

  test('undeclares the argument when it is unset again', () => {
    expect(prune(declare(example.query, ['filter']), [])).toBe(example.query);
  });

  test('keeps an undeclared argument out of the document unless pruning', () => {
    const query = declare(example.query, ['filter']);

    // the send path leaves a declaration alone, it may have been written by hand
    expect(declare(query, [])).toBe(query);
  });

  test('returns the same query when nothing changes', () => {
    const query = 'query Orders {\n  orders {\n    id\n  }\n}';

    expect(declare(query, [])).toBe(query);
    expect(prune(query, [])).toBe(query);
  });

  test('keeps hand-written values', () => {
    const query = 'query Orders {\n  orders(filter: {status: PENDING}) {\n    id\n  }\n}';

    // no variable is declared for it, that would leave the variable unused
    expect(declare(query, ['filter'])).toBe(query);
    expect(prune(query, [])).toBe(query);
  });

  test('keeps required arguments declared', () => {
    const search = generateOperationExample(schema, { kind: 'query', name: 'search' })!;
    const field = getOperationField(schema, 'query', 'search')!;

    expect(syncOperationVariables(search.query, field, () => true)).toBe(search.query);
    expect(syncOperationVariables(search.query, field, () => true, { prune: true })).toBe(
      search.query,
    );
  });

  test('ignores an unparsable query', () => {
    expect(declare('query Orders {', ['filter'])).toBe('query Orders {');
  });

  test('ignores operations that do not select the field', () => {
    const query = 'query Other {\n  search(term: $term) {\n    __typename\n  }\n}';

    expect(prune(query, ['filter'])).toBe(query);
  });
});

describe('inputTypeToJsonSchema', () => {
  test('enum type', () => {
    expect(inputTypeToJsonSchema(assertEnumType(schema.getType('OrderStatus')))).toEqual({
      type: 'string',
      title: 'OrderStatus',
      description: 'The status of an order.',
      enum: ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
    });
  });

  test('NonNull & list nesting', () => {
    const status = assertEnumType(schema.getType('OrderStatus'));
    const wrapped = new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(status)));

    expect(inputTypeToJsonSchema(wrapped)).toMatchObject({
      type: 'array',
      items: {
        type: 'string',
        enum: ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
      },
    });
  });

  test('input object with required fields', () => {
    expect(
      inputTypeToJsonSchema(assertInputObjectType(schema.getType('OrderCreateInput'))),
    ).toMatchObject({
      type: 'object',
      required: ['customerId', 'total'],
      additionalProperties: false,
      properties: {
        customerId: { type: 'string' },
        total: { type: 'number', description: 'Total amount of the order.' },
      },
    });
  });

  test('input object with defaults & custom scalar fallback', () => {
    const result = inputTypeToJsonSchema(assertInputObjectType(schema.getType('OrderFilter')));

    expect(result).toMatchObject({
      type: 'object',
      description: 'Filters for the `orders` query.',
      // `status` has a default value, `after` is nullable: nothing is required
      required: [],
      properties: {
        after: {
          // custom scalar (DateTime) fallback
          type: ['string', 'number', 'boolean'],
          description: 'Match orders created after this time.',
        },
        status: {
          type: 'string',
          default: 'PENDING',
        },
      },
    });
  });

  test('defaults are values, not GraphQL literals', () => {
    const defaults = buildSchemaFromSDL(
      `
input Page {
  first: Int = 10
  cursor: String = "start"
  tags: [String!] = ["a", "b"]
}

type Query {
  list(page: Page): String
}
`.trim(),
    );

    expect(inputTypeToJsonSchema(assertInputObjectType(defaults.getType('Page')))).toMatchObject({
      properties: {
        first: { type: 'integer', default: 10 },
        cursor: { type: 'string', default: 'start' },
        tags: { type: 'array', default: ['a', 'b'] },
      },
    });
  });

  test('@oneOf input objects are a union of their fields', () => {
    const oneOf = buildSchemaFromSDL(
      `
"How to find a product."
input ProductBy @oneOf {
  "The product ID."
  id: ID
  sku: String
}

type Query {
  product(by: ProductBy!): String
}
`.trim(),
    );

    expect(inputTypeToJsonSchema(assertInputObjectType(oneOf.getType('ProductBy')))).toEqual({
      title: 'ProductBy',
      description: 'How to find a product.',
      oneOf: [
        {
          title: 'id',
          type: 'object',
          properties: { id: { type: 'string', description: 'The product ID.' } },
          required: ['id'],
          additionalProperties: false,
        },
        {
          title: 'sku',
          type: 'object',
          properties: { sku: { type: 'string' } },
          required: ['sku'],
          additionalProperties: false,
        },
      ],
    });
  });

  test('custom scalar fallback', () => {
    expect(inputTypeToJsonSchema(assertScalarType(schema.getType('DateTime')))).toEqual({
      type: ['string', 'number', 'boolean'],
      description: 'An ISO-8601 encoded date time string.',
    });
  });

  test('recursive input objects are one cyclic schema', () => {
    // Hasura-style filters: every input references itself and its relations
    const recursive = buildSchemaFromSDL(
      `
input String_comparison_exp { _eq: String, _like: String }
input order_bool_exp {
  _and: [order_bool_exp!]
  _not: order_bool_exp
  _or: [order_bool_exp!]
  customer: customer_bool_exp
  items: item_bool_exp
}
input customer_bool_exp {
  _and: [customer_bool_exp!]
  _not: customer_bool_exp
  name: String_comparison_exp
  orders: order_bool_exp
}
input item_bool_exp {
  _not: item_bool_exp
  order: order_bool_exp
  name: String_comparison_exp
}
type Query {
  orders(where: order_bool_exp): [String!]!
}
`.trim(),
    );
    const order = inputTypeToJsonSchema(assertInputObjectType(recursive.getType('order_bool_exp')));
    const customer = order.properties!.customer as Exclude<JsonSchema, boolean>;

    expect(order.properties!._not).toBe(order);
    expect(order.properties!._and).toEqual({ type: 'array', items: order });
    expect(customer.properties!.orders).toBe(order);
    expect(
      inputTypeToJsonSchema(assertInputObjectType(recursive.getType('customer_bool_exp'))),
    ).toBe(customer);

    expect(stringify(order, { alias: true })).toBe('order_bool_exp');
    expect(stringify(order.properties!._and, { alias: true })).toBe('array<order_bool_exp>');
    expect(sample(order, { skipNonRequired: true })).toEqual({});

    // the shared form opens one level at a time
    function Form() {
      const stf = useStf({ defaultValues: { where: {} } });

      return h(
        StfProvider,
        { value: stf, children: null },
        h(
          SchemaProvider,
          { docRoot: {}, readOnly: false, writeOnly: true, children: null },
          h(FieldRows, {
            entry: { fieldName: ['where'], name: 'where', schema: order },
            onNavigate() {},
          }),
        ),
      );
    }
    const html = renderToString(h(Form));
    expect(html).toContain('_not');
    expect(html).toContain('customer_bool_exp');
  });
});
