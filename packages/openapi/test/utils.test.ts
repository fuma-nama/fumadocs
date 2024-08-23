import { describe, expect, test } from 'vitest';
import { combineSchema } from '@/utils/combine-schema';

describe('Merge object schemas', () => {
  test('Merge single object', () => {
    const result = combineSchema([
      {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two'],
          },
        },
      },
    ]);

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
    const result = combineSchema([
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
    ]);

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
    const result = combineSchema([
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
    ]);

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
    const result = combineSchema([
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
    ]);

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
    const result = combineSchema([
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
    ]);

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
});
