import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  assertEnumType,
  assertInputObjectType,
  assertScalarType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import type { ParsedSchema } from '@fumadocs/api-docs/schema';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { inputTypeToJsonSchema } from '@/playground/json-schema';
import { filterHeaderItems, getEndpointOrigin, parseStoredState } from '@/playground/storage';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

describe('playground storage', () => {
  test('parses the origin-scoped shape', () => {
    expect(
      parseStoredState(
        JSON.stringify({
          url: 'https://api.example.com/graphql',
          headers: {
            'https://api.example.com': [{ key: 'Authorization', value: 'Bearer x' }],
          },
        }),
      ),
    ).toEqual({
      url: 'https://api.example.com/graphql',
      headers: {
        'https://api.example.com': [{ key: 'Authorization', value: 'Bearer x' }],
      },
    });
  });

  test('ignores the legacy un-scoped headers array', () => {
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

  test('filters invalid header items', () => {
    expect(
      parseStoredState(
        JSON.stringify({
          headers: {
            'https://api.example.com': [
              { key: 'valid', value: 'yes' },
              { key: 1, value: 'no' },
              'nope',
              null,
              { key: 'missing-value' },
            ],
            'https://other.example.com': 'nope',
          },
        }),
      ),
    ).toEqual({
      headers: {
        'https://api.example.com': [{ key: 'valid', value: 'yes' }],
      },
    });

    expect(filterHeaderItems('x')).toEqual([]);
    expect(filterHeaderItems([{ key: 'a', value: 'b' }, { key: 'a' }, 0])).toEqual([
      { key: 'a', value: 'b' },
    ]);
  });

  test('getEndpointOrigin', () => {
    expect(getEndpointOrigin('https://api.example.com/graphql')).toBe('https://api.example.com');
    expect(getEndpointOrigin('http://localhost:4000/api/graphql')).toBe('http://localhost:4000');
    // relative URLs resolve against the given base (`window.location.origin` in browsers)
    expect(getEndpointOrigin('/graphql', 'http://localhost:3000')).toBe('http://localhost:3000');
    // invalid URLs
    expect(getEndpointOrigin('not a url')).toBeUndefined();
    expect(getEndpointOrigin('')).toBeUndefined();
  });
});

describe('inputTypeToJsonSchema', () => {
  test('enum type', () => {
    expect(inputTypeToJsonSchema(assertEnumType(schema.getType('OrderStatus')))).toEqual({
      type: 'string',
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

  test('custom scalar fallback', () => {
    expect(inputTypeToJsonSchema(assertScalarType(schema.getType('DateTime')))).toEqual({
      type: ['string', 'number', 'boolean'],
      description: 'An ISO-8601 encoded date time string.',
    });
  });

  test('cyclic input objects terminate', () => {
    const cyclic = buildSchemaFromSDL(
      `
input Node {
  child: Node
  name: String
}

type Query {
  find(node: Node): String
}
`.trim(),
    );

    let current = inputTypeToJsonSchema(assertInputObjectType(cyclic.getType('Node')));
    for (let i = 0; i < 8; i++) {
      expect(current).toMatchObject({ type: 'object', additionalProperties: false });
      const properties = (current as Exclude<ParsedSchema, boolean>).properties!;
      current = properties.child as ParsedSchema;
    }

    // the cycle guard stops the recursion
    expect(current).toMatchObject({ type: 'object', additionalProperties: true });
  });
});
