import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createGraphQL, type GraphQLPageData } from '@/server';
import { loadExamples } from '@/utils/examples';
import { type LoadedSchema, loadSchema } from '@/utils/load-schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schemaFile = path.join(cwd, './fixtures/store.graphql');
const examplesFile = path.join(cwd, './fixtures/examples.graphql');

async function load(
  input: string[] | Record<string, string[]>,
  inputs: Record<string, string> = { store: schemaFile },
) {
  const schemas: Record<string, LoadedSchema> = {};
  for (const [id, sdl] of Object.entries(inputs)) schemas[id] = await loadSchema(sdl);
  return loadExamples(input, schemas);
}

const { store } = await load([examplesFile]);
const [customerWithOrders, customerName] = store['query:customer'];
const [dashboard] = store['query:search'];
const [nodeById] = store['query:node'];

describe('loadExamples', () => {
  test('examples of the root fields their named operations select', () => {
    expect(Object.keys(store)).toEqual([
      'query:customer',
      'query:search',
      'query:orders',
      'query:node',
    ]);
    expect(customerWithOrders.name).toBe('Customer With Orders');
    expect(customerName.name).toBe('Customer Name');
    // `__typename` is not a root field, the operation belongs to both fields
    expect(store['query:orders']).toEqual([dashboard]);
  });

  test('descriptions from the comment lines right above operations', () => {
    expect(customerWithOrders.description).toBe(
      'A customer with their latest orders.\n\n- `first` limits the orders',
    );
    expect(dashboard.description).toBe('Search results with the pending orders.');
    // a comment after code belongs to that line
    expect(customerName.description).toBeUndefined();
  });

  test('descriptions of operations take precedence over comments', () => {
    expect(nodeById.description).toBe('Any node by its ID, **as a customer**.');
  });

  test('default values become variables', () => {
    expect(customerWithOrders.variables).toEqual({ id: 'cus_42', first: 3 });
    expect(customerWithOrders.query).toContain('query CustomerWithOrders($id: ID!, $first: Int) {');
    // non-null variables without a default are sampled, nullable ones can be absent
    expect(dashboard.variables).toEqual({ term: 'string' });
  });

  test('fragments and aliases', () => {
    expect(customerWithOrders.response).toEqual({
      data: {
        customer: {
          name: 'string',
          recent: [{ id: '1', total: 10.5, customer: { id: '1', name: 'string' } }],
        },
      },
    });
  });

  test('abstract types are sampled as the first type their selection targets', () => {
    expect(dashboard.response).toEqual({
      data: {
        __typename: 'Query',
        search: [{ __typename: 'Order', status: 'PENDING' }],
        pending: [{ id: '1' }],
      },
    });
    expect(nodeById.response).toEqual({
      data: { node: { __typename: 'Customer', id: '1', name: 'string' } },
    });
  });

  test('descriptions are not printed in queries', async () => {
    const { store } = await load([
      `"""The name."""
query Described("The ID." $id: ID! = "cus_42") {
  customer(id: $id) {
    ...Name
  }
}

"""Fields of a name."""
fragment Name on Customer {
  name
}`,
    ]);

    expect(store['query:customer'][0].query).toBe(
      'query Described($id: ID!) {\n  customer(id: $id) {\n    ...Name\n  }\n}\n\nfragment Name on Customer {\n  name\n}',
    );
  });

  test('root fields take arguments as the variables of their names', async () => {
    await expect(load(['query Literal { customer(id: "cus_42") { name } }'])).rejects.toThrow(
      'invalid example in GraphQL text:\n\nIn schema "store":\n\n"Literal" passes "cus_42" to "id" of Query.customer, use $id so the playground can edit it.',
    );
    await expect(
      load(['query Other($customerId: ID!) { customer(id: $customerId) { name } }']),
    ).rejects.toThrow(
      '"Other" passes $customerId to "id" of Query.customer, use $id so the playground can edit it.',
    );
    await expect(
      load([
        'query Aliases($id: ID!, $other: ID!) { first: customer(id: $id) { name } second: customer(id: $other) { name } }',
      ]),
    ).rejects.toThrow('"Aliases" passes $other to "id" of Query.customer');

    // aliases of root fields with the right variables, and arguments of nested fields are free
    const { store } = await load([
      'query Aliased($id: ID!) { someone: customer(id: $id) { orders(first: 3) { id } } }',
    ]);
    expect(store['query:customer'][0].name).toBe('Aliased');
  });

  test('invalid operations', async () => {
    await expect(load(['query Typo { custmer(id: "1") { name } }'])).rejects.toThrow(
      'In schema "store":\n\nCannot query field "custmer" on type "Query". Did you mean "customer"?',
    );
    await expect(
      load(['query Cycle { ...A } fragment A on Query { ...B } fragment B on Query { ...A }']),
    ).rejects.toThrow('Cannot spread fragment "A" within itself via "B".');
    await expect(load(['query Typename { __typename }'])).rejects.toThrow(
      '"Typename" selects no root field of the listed schemas.',
    );
    await expect(load(['query { customer(id: "1") { name } }'])).rejects.toThrow(
      'invalid example in GraphQL text:\n\nExample operations must be named.',
    );
    await expect(load(['query A { orders { id } } query A { orders { total } }'])).rejects.toThrow(
      'There can be only one operation named "A".',
    );
    await expect(load(['query Broken {'])).rejects.toThrow('Syntax Error');
  });
});

describe('inputs of several schemas', () => {
  const inputs = { a: 'type Query { a: String }', b: 'type Query { b: String }' };

  test('documents of an array belong to the schemas they are valid in', async () => {
    const examples = await load(['query A { a }', 'query B { b }'], inputs);

    expect(examples.a['query:a'][0].name).toBe('A');
    expect(examples.a['query:b']).toBeUndefined();
    expect(examples.b['query:b'][0].name).toBe('B');

    const shared = await load(['query X { item { x } }'], {
      a: 'type Query { item: A } type A { x: Int }',
      b: 'type Query { item: B } type B { y: Int }',
    });
    expect(shared.a['query:item'][0].name).toBe('X');
    expect(shared.b['query:item']).toBeUndefined();

    const error = load(['query C { c }'], inputs);
    await expect(error).rejects.toThrow('invalid example in GraphQL text:\n\nIn schema "a":');
    await expect(error).rejects.toThrow('In schema "b":');
  });

  test('documents of a record belong to their schema', async () => {
    const examples = await load({ a: ['query A { a }'] }, inputs);

    expect(examples.a['query:a'][0].name).toBe('A');
    expect(examples.b).toEqual({});
    await expect(load({ a: ['query B { b }'] }, inputs)).rejects.toThrow(
      'In schema "a":\n\nCannot query field "b" on type "Query".',
    );
    await expect(load({ c: ['query A { a }'] }, inputs)).rejects.toThrow(
      'the schema "c" of "examples" is not listed in "input"',
    );
  });
});

describe('server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('pages receive the examples of their operations', async () => {
    const server = createGraphQL({ input: { store: schemaFile }, examples: [examplesFile] });
    const source = await server.staticSource();
    const payload = (filePath: string) =>
      (
        source.files.find((file) => file.path === filePath)!.data as GraphQLPageData
      ).getGraphQLPageProps().payload;

    expect(Object.keys(payload('/queries/customer.mdx').examples!)).toEqual(['query:customer']);
    expect(payload('/queries/customer.mdx').examples!['query:customer']).toHaveLength(2);
    expect(payload('/mutations/createOrder.mdx')).not.toHaveProperty('examples');
  });

  test('documents are cached with schemas', async () => {
    const fetch = vi.fn(async () => new Response('query Hello { hello }'));
    vi.stubGlobal('fetch', fetch);
    const options = {
      input: { api: 'type Query { hello: String }' },
      examples: ['https://example.com/examples.graphql'],
    };

    const server = createGraphQL(options);
    await server.staticSource();
    await server.staticSource();
    expect(fetch).toHaveBeenCalledTimes(1);

    const dynamic = createGraphQL(options).dynamicSource();
    await dynamic.files();
    await dynamic.files();
    expect(fetch).toHaveBeenCalledTimes(2);
    dynamic.invalidate?.();
    await dynamic.files();
    expect(fetch).toHaveBeenCalledTimes(3);

    const uncached = createGraphQL({ ...options, disableCache: true });
    await uncached.staticSource();
    await uncached.staticSource();
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  test('errors name the document', async () => {
    vi.stubGlobal('fetch', async () => new Response('query Typo { helo }'));
    const server = createGraphQL({
      input: { api: 'type Query { hello: String }' },
      examples: ['https://example.com/examples.graphql'],
    });

    await expect(server.staticSource()).rejects.toThrow(
      'invalid example in https://example.com/examples.graphql:',
    );
  });
});
