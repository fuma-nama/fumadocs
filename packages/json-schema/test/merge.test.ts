import { describe, expect, test } from 'vitest';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { mergeAllOf } from '@/merge';
import type { JsonSchema } from '@/types';

describe('Merge object schemas', () => {
  test('Merge multiple objects', () => {
    const result = mergeAllOf({
      allOf: [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
              enum: ['one', 'two'],
            },
          },
        },
        {
          type: 'object',
          properties: {
            hello: {
              type: 'number',
            },
          },
        },
      ],
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "hello": {
            "type": "number",
          },
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: required', () => {
    const result = mergeAllOf({
      allOf: [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
              enum: ['one', 'two'],
            },
          },
        },
        {
          type: 'object',
          properties: {
            hello: {
              type: 'number',
            },
          },
          required: ['hello'],
        },
      ],
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "hello": {
            "type": "number",
          },
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "required": [
          "hello",
        ],
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: additional properties', () => {
    const result = mergeAllOf({
      allOf: [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
              enum: ['one', 'two'],
            },
          },
          additionalProperties: true,
        },
        {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      ],
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "additionalProperties": {
          "type": "string",
        },
        "properties": {
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: `allOf`', () => {
    const result = mergeAllOf({
      allOf: [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
              enum: ['one', 'two'],
            },
          },
        },
        {
          allOf: [
            {
              type: 'object',
              properties: {
                hello: {
                  type: 'number',
                },
              },
            },
            {
              type: 'object',
              properties: {
                world: {
                  type: 'number',
                },
              },
            },
          ],
        },
      ],
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "hello": {
            "type": "number",
          },
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
          "world": {
            "type": "number",
          },
        },
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: `description`', () => {
    expect(
      mergeAllOf({
        allOf: [
          {
            type: 'number',
            format: 'decimal',
            description: 'Reusable type description',
          },
          {
            description: 'Property-specific description',
          },
        ],
      }),
    ).toMatchInlineSnapshot(`
      {
        "description": "Property-specific description",
        "format": "decimal",
        "type": "number",
      }
    `);

    expect(
      mergeAllOf({
        description: 'Outer',
        allOf: [{ description: 'Reusable type' }],
      }),
    ).toEqual({ description: 'Outer' });
  });

  test('Production: `allOf` with multiple `oneOf`', () => {
    const result = mergeAllOf({
      type: 'object',
      allOf: [
        {
          oneOf: [
            {
              type: 'object',
              title: 'optionA',
              properties: { a: { type: 'string' } },
              required: ['a'],
            },
            {
              type: 'object',
              title: 'optionB',
              properties: { b: { type: 'string' } },
              required: ['b'],
            },
          ],
        },
        {
          oneOf: [
            {
              type: 'object',
              title: 'optionX',
              properties: { x: { type: 'number' } },
              required: ['x'],
            },
            {
              type: 'object',
              title: 'optionY',
              properties: { y: { type: 'number' } },
              required: ['y'],
            },
          ],
        },
      ],
    });
    // Should produce cross-product: A&X, A&Y, B&X, B&Y
    expect(typeof result !== 'boolean' && result.oneOf).toHaveLength(4);
  });

  test('Production: `allOf`', () => {
    const result = mergeAllOf({
      type: 'object',
      allOf: [
        {
          properties: {
            name: { type: 'string' },
          },
        },
        {
          oneOf: [
            {
              type: 'object',
              title: 'human',
              required: ['human'],
              properties: {
                human: {
                  type: 'object',
                  properties: {
                    givenName: { type: 'string' },
                    familyName: { type: 'string' },
                  },
                },
              },
            },
            {
              type: 'object',
              title: 'machine',
              required: ['machine'],
              properties: {
                machine: {
                  type: 'object',
                  properties: {
                    serialNumber: { type: 'string' },
                  },
                },
              },
            },
          ],
        },
      ],
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "oneOf": [
          {
            "properties": {
              "human": {
                "properties": {
                  "familyName": {
                    "type": "string",
                  },
                  "givenName": {
                    "type": "string",
                  },
                },
                "type": "object",
              },
              "name": {
                "type": "string",
              },
            },
            "required": [
              "human",
            ],
            "title": "human",
            "type": "object",
          },
          {
            "properties": {
              "machine": {
                "properties": {
                  "serialNumber": {
                    "type": "string",
                  },
                },
                "type": "object",
              },
              "name": {
                "type": "string",
              },
            },
            "required": [
              "machine",
            ],
            "title": "machine",
            "type": "object",
          },
        ],
      }
    `);
  });

  test('Intersect overlapping `type` sets instead of returning `false`', () => {
    // a nullable member (`type` array, from `nullable: true`) merged with a typed member
    expect(
      mergeAllOf({
        allOf: [{ type: ['string', 'null'] }, { type: 'string' }],
      }),
    ).toEqual({ type: 'string' });

    // two overlapping type arrays keep the shared member
    expect(
      mergeAllOf({
        allOf: [{ type: ['string', 'null'] }, { type: ['string', 'number'] }],
      }),
    ).toEqual({ type: 'string' });

    // disjoint type sets are genuinely impossible
    expect(
      mergeAllOf({
        allOf: [{ type: ['string'] }, { type: ['number'] }],
      }),
    ).toEqual(false);
  });
});

test('Merge properties named `__proto__`', () => {
  const result = mergeAllOf({
    allOf: [
      JSON.parse('{"properties":{"__proto__":{"type":"string"},"constructor":{"type":"string"}}}'),
      JSON.parse('{"properties":{"__proto__":{"minLength":1}}}'),
    ],
  });

  expect(JSON.stringify(result)).toBe(
    '{"properties":{"__proto__":{"allOf":[{"type":"string"},{"minLength":1}]},"constructor":{"type":"string"}}}',
  );
});

describe('Recursive schemas', () => {
  /** plain JSON of a merged schema, without the virtual `$ref-value` of magic proxies */
  function toJson(schema: JsonSchema) {
    return JSON.parse(JSON.stringify(schema, (k, v) => (k === '$ref-value' ? undefined : v)));
  }

  test('a parent listing its subtypes in `oneOf` (#3724)', () => {
    const doc = createMagicProxy({
      components: {
        schemas: {
          RuleNode: {
            type: 'object',
            properties: { id: { type: 'string' } },
            oneOf: [
              { $ref: '#/components/schemas/GroupNode' },
              { $ref: '#/components/schemas/ConditionNode' },
            ],
          },
          GroupNode: {
            allOf: [
              { $ref: '#/components/schemas/RuleNode' },
              {
                type: 'object',
                properties: {
                  children: { type: 'array', items: { $ref: '#/components/schemas/RuleNode' } },
                },
              },
            ],
          },
          ConditionNode: { type: 'object', properties: { field: { type: 'string' } } },
        },
      },
    }) as any;

    expect(toJson(mergeAllOf(doc.components.schemas.GroupNode))).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        children: { type: 'array', items: { $ref: '#/components/schemas/RuleNode' } },
      },
    });
  });

  test('nested schemas are merged when reading', () => {
    const doc = createMagicProxy({
      components: {
        schemas: {
          Tree: {
            type: 'object',
            properties: {
              children: { type: 'array', items: { $ref: '#/components/schemas/Tree' } },
            },
          },
          Extended: {
            allOf: [
              { $ref: '#/components/schemas/Tree' },
              {
                properties: {
                  children: { type: 'array', items: { $ref: '#/components/schemas/Extended' } },
                  extra: { type: 'string' },
                },
              },
            ],
          },
        },
      },
    }) as any;

    const merged = mergeAllOf(doc.components.schemas.Extended) as any;
    expect(toJson(merged)).toEqual({
      type: 'object',
      properties: {
        children: {
          allOf: [
            { type: 'array', items: { $ref: '#/components/schemas/Tree' } },
            { type: 'array', items: { $ref: '#/components/schemas/Extended' } },
          ],
        },
        extra: { type: 'string' },
      },
    });

    const children = mergeAllOf(merged.properties.children) as any;
    expect(toJson(children)).toEqual({
      type: 'array',
      items: {
        allOf: [{ $ref: '#/components/schemas/Tree' }, { $ref: '#/components/schemas/Extended' }],
      },
    });
    const item = mergeAllOf(children.items) as any;
    expect(Object.keys(item.properties)).toEqual(['children', 'extra']);
  });

  test('cycles of `allOf` and unions', () => {
    const doc = createMagicProxy({
      components: {
        schemas: {
          A: { title: 'A', allOf: [{ $ref: '#/components/schemas/B' }] },
          B: { title: 'B', allOf: [{ $ref: '#/components/schemas/A' }, { type: 'object' }] },
          C: { oneOf: [{ $ref: '#/components/schemas/D' }, { type: 'string' }] },
          D: { oneOf: [{ $ref: '#/components/schemas/C' }, { type: 'number' }] },
        },
      },
    }) as any;

    expect(toJson(mergeAllOf(doc.components.schemas.A))).toEqual({ type: 'object', title: 'A' });
    expect(toJson(mergeAllOf({ allOf: [doc.components.schemas.C, { title: 'Other' }] }))).toEqual({
      title: 'Other',
      oneOf: [{}, { type: 'string' }],
    });
  });
});
