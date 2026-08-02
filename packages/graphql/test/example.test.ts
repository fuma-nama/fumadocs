import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { generateOperationExample } from '@/utils/example';
import { buildSchemaFromSDL } from '@/utils/build-schema';

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
