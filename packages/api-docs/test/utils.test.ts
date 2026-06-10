import { describe, expect, test } from 'vitest';
import { mergeAllOf } from '@/schema/merge';
import { joinURL, resolveServerUrl } from '@/utils/url';

describe('Merge object schemas', () => {
  test('Merge single object', () => {
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
      ],
    });

    expect(result).toMatchInlineSnapshot(`
      {
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
        "additionalProperties": true,
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
});

describe('URL utilities', () => {
  describe('joinURL', () => {
    test('joins base URL with pathname', () => {
      expect(joinURL('https://api.example.com', 'users')).toBe('https://api.example.com/users');
    });

    test('handles trailing slash in base', () => {
      expect(joinURL('https://api.example.com/', 'users')).toBe('https://api.example.com/users');
    });

    test('handles leading slash in pathname', () => {
      expect(joinURL('https://api.example.com', '/users')).toBe('https://api.example.com/users');
    });

    test('handles both trailing and leading slashes', () => {
      expect(joinURL('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
    });

    test('handles empty pathname', () => {
      expect(joinURL('https://api.example.com', '')).toBe('https://api.example.com');
    });
  });

  describe('resolveServerUrl', () => {
    test('replaces single variable', () => {
      expect(resolveServerUrl('https://{host}/api', { host: 'api.example.com' })).toBe(
        'https://api.example.com/api',
      );
    });

    test('replaces multiple variables', () => {
      expect(
        resolveServerUrl('https://{host}:{port}/api/{version}', {
          host: 'api.example.com',
          port: '8080',
          version: 'v1',
        }),
      ).toBe('https://api.example.com:8080/api/v1');
    });

    test('handles no variables', () => {
      expect(resolveServerUrl('https://api.example.com', {})).toBe('https://api.example.com');
    });
  });
});
