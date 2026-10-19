import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { type FragmentDefinitionNode, type OperationDefinitionNode, parse } from 'graphql';
import { createOperationExample, generateOperationExample } from '@/utils/example';
import { buildSchemaFromSDL } from '@/utils/build-schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

describe('generateOperationExample', () => {
  test('optional arguments are left out', () => {
    const example = generateOperationExample(schema, { kind: 'query', name: 'orders' })!;

    expect(example.query).toMatch(/^query Orders {\n  orders {\n/);
    expect(example.variables).toBeUndefined();
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

  test('interface return type', () => {
    expect(generateOperationExample(schema, { kind: 'query', name: 'node' })?.response).toEqual({
      data: { node: { id: '1' } },
    });
  });

  test('@oneOf input objects take one field', () => {
    const oneOf = buildSchemaFromSDL(`
input UserBy @oneOf {
  id: ID
  email: String
}

type Query {
  user(by: UserBy!): String
}`);

    expect(generateOperationExample(oneOf, { kind: 'query', name: 'user' })?.variables).toEqual({
      by: { id: '1' },
    });
  });

  test('unknown operation', () => {
    expect(generateOperationExample(schema, { kind: 'query', name: 'unknown' })).toBeUndefined();
  });
});

describe('createOperationExample', () => {
  test('values of literals are plain JSON data', () => {
    const plot = buildSchemaFromSDL(`
input Tag {
  name: String
}

input Range {
  min: Int
  tags: [Tag!]
}

input Area {
  range: Range = { min: 1, tags: [{ name: "a" }] }
}

type Query {
  plot(ranges: [Range!]!, area: Area!): Int
}`);
    const [operation] = parse(`
query Plot($ranges: [Range!]! = [{ min: 2, tags: [{ name: "b" }] }], $area: Area!) {
  plot(ranges: $ranges, area: $area)
}`).definitions as [OperationDefinitionNode];
    const variables = createOperationExample(plot, operation).variables as {
      ranges: { tags: object[] }[];
      // sampled with the default of field
      area: { range: { tags: object[] } };
    };

    for (const value of [
      variables.ranges[0],
      variables.ranges[0].tags[0],
      variables.area.range,
      variables.area.range.tags[0],
    ]) {
      expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    }
  });

  test('merges fields of the same response key', () => {
    const document = parse(`
query Contact {
  customer(id: "1") {
    contact {
      email
    }
    ...Phone
  }
}

fragment Phone on Customer {
  contact {
    phone
  }
}`);
    const [operation, fragment] = document.definitions as [
      OperationDefinitionNode,
      FragmentDefinitionNode,
    ];

    expect(createOperationExample(schema, operation, [fragment]).response).toEqual({
      data: { customer: { contact: { email: 'string', phone: 'string' } } },
    });
  });
});
