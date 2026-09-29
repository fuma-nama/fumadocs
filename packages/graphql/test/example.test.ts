import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { generateOperationExample, syncOperationVariables } from '@/utils/example';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { getOperationField } from '@/utils/schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

describe('generateOperationExample', () => {
  test('query with input object & nested composite types', () => {
    expect(generateOperationExample(schema, { kind: 'query', name: 'orders' }))
      .toMatchInlineSnapshot(`
        {
          "query": "query Orders {
          orders {
            id
            status
            createdAt
            total
            customer {
              id
              name
              contact {
                email
                phone
              }
              orders {
                id
                status
                createdAt
                total
              }
            }
          }
        }",
          "response": {
            "data": {
              "orders": [
                {
                  "createdAt": "<DateTime>",
                  "customer": {
                    "contact": {
                      "email": "string",
                      "phone": "string",
                    },
                    "id": "1",
                    "name": "string",
                    "orders": [
                      {
                        "createdAt": "<DateTime>",
                        "id": "1",
                        "status": "PENDING",
                        "total": 10.5,
                      },
                    ],
                  },
                  "id": "1",
                  "status": "PENDING",
                  "total": 10.5,
                },
              ],
            },
          },
          "variables": undefined,
        }
      `);
  });

  test('mutation with required input variables', () => {
    expect(generateOperationExample(schema, { kind: 'mutation', name: 'createOrder' }))
      .toMatchInlineSnapshot(`
        {
          "query": "mutation CreateOrder($input: OrderCreateInput!) {
          createOrder(input: $input) {
            id
            status
            createdAt
            total
            customer {
              id
              name
              contact {
                email
                phone
              }
              orders {
                id
                status
                createdAt
                total
              }
            }
          }
        }",
          "response": {
            "data": {
              "createOrder": {
                "createdAt": "<DateTime>",
                "customer": {
                  "contact": {
                    "email": "string",
                    "phone": "string",
                  },
                  "id": "1",
                  "name": "string",
                  "orders": [
                    {
                      "createdAt": "<DateTime>",
                      "id": "1",
                      "status": "PENDING",
                      "total": 10.5,
                    },
                  ],
                },
                "id": "1",
                "status": "PENDING",
                "total": 10.5,
              },
            },
          },
          "variables": {
            "input": {
              "customerId": "1",
              "total": 10.5,
            },
          },
        }
      `);
  });

  test('union return type', () => {
    expect(generateOperationExample(schema, { kind: 'query', name: 'search' }))
      .toMatchInlineSnapshot(`
        {
          "query": "query Search($term: String!) {
          search(term: $term) {
            __typename
            ... on Customer {
              id
              name
              contact {
                email
                phone
              }
              orders {
                id
                status
                createdAt
                total
              }
            }
          }
        }",
          "response": {
            "data": {
              "search": [
                {
                  "__typename": "Customer",
                  "contact": {
                    "email": "string",
                    "phone": "string",
                  },
                  "id": "1",
                  "name": "string",
                  "orders": [
                    {
                      "createdAt": "<DateTime>",
                      "id": "1",
                      "status": "PENDING",
                      "total": 10.5,
                    },
                  ],
                },
              ],
            },
          },
          "variables": {
            "term": "string",
          },
        }
      `);
  });

  test('unknown operation', () => {
    expect(generateOperationExample(schema, { kind: 'query', name: 'unknown' })).toBeUndefined();
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
