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
import { getResponseErrors } from '@/ui/playground/errors';
import { toRequestValues } from '@/ui/playground/use-playground';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

describe('playground storage', () => {
  test('keeps the valid headers by origin', () => {
    expect(
      parseStoredState(
        JSON.stringify({
          url: 'https://api.example.com/graphql',
          headers: {
            'https://api.example.com': {
              Authorization: 'Bearer x',
              count: 1,
              empty: null,
              nested: {},
            },
            'https://old.example.com': [{ key: 'Authorization', value: 'Bearer x' }],
            'https://other.example.com': 'nope',
          },
        }),
      ),
    ).toEqual({
      url: 'https://api.example.com/graphql',
      headers: { 'https://api.example.com': { Authorization: 'Bearer x' } },
    });

    // an own property, the prototype stays untouched
    const { headers } = parseStoredState('{"headers":{"__proto__":{"polluted":"yes"}}}');
    expect(Object.keys(headers!)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(headers)).toBe(Object.prototype);
  });

  test('drops malformed content', () => {
    expect(parseStoredState(null)).toEqual({});
    expect(parseStoredState('')).toEqual({});
    expect(parseStoredState('not json')).toEqual({});
    expect(parseStoredState('"text"')).toEqual({});
    expect(parseStoredState('[1,2]')).toEqual({});
    expect(parseStoredState(JSON.stringify({ url: 10, headers: 'nope' }))).toEqual({});
    expect(
      parseStoredState(
        JSON.stringify({
          url: 'https://api.example.com/graphql',
          headers: [{ key: 'Authorization', value: 'Bearer x' }],
        }),
      ),
    ).toEqual({ url: 'https://api.example.com/graphql' });
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

test('request values leave out unset values and empty variables', () => {
  const data = { variables: { id: '1', filter: undefined }, headers: { 'X-Empty': undefined } };
  expect(toRequestValues(JSON.stringify(data))).toEqual({ variables: { id: '1' }, headers: {} });
  expect(
    toRequestValues(JSON.stringify({ variables: { filter: undefined }, headers: { a: 'b' } })),
  ).toEqual({ variables: undefined, headers: { a: 'b' } });
  // variables edited as JSON can be anything
  expect(toRequestValues(JSON.stringify({ variables: [], headers: {} }))).toEqual({
    variables: [],
    headers: {},
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
  const fields = schema.getQueryType()!.getFields();
  const example = generateOperationExample(schema, { kind: 'query', name: 'orders' })!;
  /** sync `orders(filter: OrderFilter)`, every argument is optional */
  const sync = (query: string, set: string[], prune = false) =>
    syncOperationVariables(query, fields.orders, (name) => set.includes(name), { prune });

  test('declares a set argument, undeclares it only when pruning', () => {
    // the generated example only declares required arguments
    expect(example.query).not.toContain('$filter');
    const declared = sync(example.query, ['filter']);
    expect(declared).toContain('query Orders($filter: OrderFilter) {');
    expect(declared).toContain('orders(filter: $filter) {');

    // sending leaves a declaration alone, it may have been written by hand
    expect(sync(declared, [])).toBe(declared);
    expect(sync(declared, [], true)).toBe(example.query);
  });

  test('keeps hand-written values and required arguments', () => {
    const query = 'query Orders {\n  orders(filter: {status: PENDING}) {\n    id\n  }\n}';
    // no variable is declared for it, that would leave the variable unused
    expect(sync(query, ['filter'])).toBe(query);
    expect(sync(query, [], true)).toBe(query);

    const search = generateOperationExample(schema, { kind: 'query', name: 'search' })!;
    expect(syncOperationVariables(search.query, fields.search, () => false, { prune: true })).toBe(
      search.query,
    );
  });

  test('returns the query when nothing changes', () => {
    const query = 'query Orders {\n  orders {\n    id\n  }\n}';
    expect(sync(query, [])).toBe(query);
    expect(sync(query, [], true)).toBe(query);
    expect(sync('query Orders {', ['filter'])).toBe('query Orders {');
    // operations that don't select the field
    const other = 'query Other {\n  search(term: $term) {\n    __typename\n  }\n}';
    expect(sync(other, ['filter'], true)).toBe(other);
  });
});

describe('inputTypeToJsonSchema', () => {
  test('enums, scalars and wrapping types', () => {
    const status = assertEnumType(schema.getType('OrderStatus'));
    const statusSchema = {
      type: 'string',
      title: 'OrderStatus',
      description: 'The status of an order.',
      enum: ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
    };

    expect(inputTypeToJsonSchema(status)).toEqual(statusSchema);
    expect(
      inputTypeToJsonSchema(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(status)))),
    ).toEqual({ type: 'array', items: statusSchema });
    // custom scalars accept any value
    expect(inputTypeToJsonSchema(assertScalarType(schema.getType('DateTime')))).toEqual({
      type: ['string', 'number', 'boolean'],
      description: 'An ISO-8601 encoded date time string.',
    });
  });

  test('input objects with required fields and defaults', () => {
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
    expect(
      inputTypeToJsonSchema(assertInputObjectType(schema.getType('OrderFilter'))),
    ).toMatchObject({
      description: 'Filters for the `orders` query.',
      // `status` has a default value, `after` is nullable: nothing is required
      required: [],
      properties: {
        after: {
          type: ['string', 'number', 'boolean'],
          description: 'Match orders created after this time.',
        },
        status: { type: 'string', default: 'PENDING' },
      },
    });

    // defaults are values, not GraphQL literals
    const defaults = buildSchemaFromSDL(`
      input Page { first: Int = 10, cursor: String = "start", tags: [String!] = ["a", "b"] }
      type Query { list(page: Page): String }
    `);
    expect(inputTypeToJsonSchema(assertInputObjectType(defaults.getType('Page')))).toMatchObject({
      properties: {
        first: { type: 'integer', default: 10 },
        cursor: { type: 'string', default: 'start' },
        tags: { type: 'array', default: ['a', 'b'] },
      },
    });
  });

  test('@oneOf input objects are a union of their fields', () => {
    const oneOf = buildSchemaFromSDL(`
      "How to find a product."
      input ProductBy @oneOf {
        "The product ID."
        id: ID
        sku: String
      }
      type Query { product(by: ProductBy!): String }
    `);

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

  test('recursive input objects are one cyclic schema', () => {
    // Hasura-style filters: every input references itself and its relations
    const recursive = buildSchemaFromSDL(`
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
      type Query { orders(where: order_bool_exp): [String!]! }
    `);
    const order = inputTypeToJsonSchema(assertInputObjectType(recursive.getType('order_bool_exp')));
    const customer = order.properties!.customer as Exclude<JsonSchema, boolean>;

    expect(order.properties!._not).toBe(order);
    expect(order.properties!._and).toEqual({ type: 'array', items: order });
    expect(customer.properties!.orders).toBe(order);

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
