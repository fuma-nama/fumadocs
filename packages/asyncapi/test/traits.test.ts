import { describe, expect, test } from 'vitest';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { applyTraits } from '@/utils/traits';
import type { MessageObject, OperationObject } from '@/types/asyncapi-3';

describe('applyTraits', () => {
  test('fills missing properties without overriding target', () => {
    expect(
      applyTraits({
        description: 'Operation description',
        traits: [
          { name: 'UserSignup', description: 'Trait description' },
          { tags: [{ name: 'user' }] },
        ],
      }),
    ).toEqual({
      description: 'Operation description',
      name: 'UserSignup',
      tags: [{ name: 'user' }],
    });
  });

  test('deep merges nested objects like bindings', () => {
    expect(
      applyTraits({
        bindings: { kafka: { groupId: { type: 'string' } } },
        traits: [
          { bindings: { kafka: { clientId: { type: 'string' } }, http: { method: 'POST' } } },
        ],
      }),
    ).toEqual({
      bindings: {
        kafka: {
          groupId: { type: 'string' },
          clientId: { type: 'string' },
        },
        http: { method: 'POST' },
      },
    });
  });

  test('later traits override earlier ones, the target wins', () => {
    expect(
      applyTraits({
        summary: 'target',
        traits: [
          { summary: 'first', description: 'first' },
          { summary: 'second', description: 'second' },
        ],
      }),
    ).toEqual({ summary: 'target', description: 'second' });
  });

  test('null removes a property, arrays are replaced', () => {
    expect(
      applyTraits({
        description: null,
        tags: [{ name: 'target' }],
        traits: [{ description: 'trait', tags: [{ name: 'a' }, { name: 'b' }] }],
      }),
    ).toEqual({ tags: [{ name: 'target' }] });
  });

  test('does not override existing nested binding fields', () => {
    expect(
      applyTraits({
        bindings: { kafka: { groupId: 'from-operation' } },
        traits: [{ bindings: { kafka: { groupId: 'from-trait', clientId: 'from-trait' } } }],
      }),
    ).toEqual({
      bindings: {
        kafka: {
          groupId: 'from-operation',
          clientId: 'from-trait',
        },
      },
    });
  });
});

describe('operations', () => {
  test('merges operation traits', () => {
    const operation = applyTraits({
      action: 'receive',
      channel: { address: 'test' },
      bindings: {
        kafka: {
          groupId: { type: 'string', enum: ['my-group'] },
        },
      },
      traits: [
        {
          bindings: {
            kafka: {
              clientId: { type: 'string', enum: ['shared-client'] },
            },
          },
        },
      ],
    } as OperationObject);

    expect(operation.traits).toBeUndefined();
    expect(operation.bindings).toEqual({
      kafka: {
        groupId: { type: 'string', enum: ['my-group'] },
        clientId: { type: 'string', enum: ['shared-client'] },
      },
    });
  });
});

describe('messages', () => {
  test('merges message traits into existing headers', () => {
    const message = applyTraits({
      name: 'lightMeasured',
      headers: {
        type: 'object',
        properties: {
          correlationId: { type: 'string' },
        },
      },
      traits: [
        {
          headers: {
            type: 'object',
            properties: {
              'content-type': { type: 'string' },
            },
          },
        },
      ],
    } as MessageObject);

    expect(message.traits).toBeUndefined();
    expect(message.headers).toEqual({
      type: 'object',
      properties: {
        correlationId: { type: 'string' },
        'content-type': { type: 'string' },
      },
    });
  });

  test('applies trait headers when message has none', () => {
    const message = applyTraits({
      name: 'lightMeasured',
      traits: [
        {
          headers: {
            type: 'object',
            properties: {
              'content-type': { type: 'string' },
            },
          },
        },
      ],
    } as MessageObject);

    expect(message.headers).toEqual({
      type: 'object',
      properties: {
        'content-type': { type: 'string' },
      },
    });
  });

  test('keeps properties named `traits` in schemas', () => {
    const headers = (traits: object) => ({ type: 'object', properties: { traits } });
    const message = applyTraits({
      headers: headers({ type: 'string' }),
      traits: [{ headers: headers({ type: 'array' }) }],
    } as MessageObject);

    expect(message.headers).toEqual(headers({ type: 'string' }));
  });

  test('recursive schemas in the trait and message', () => {
    const recursive = (name: string) => ({
      type: 'object',
      properties: { child: { $ref: `#/components/schemas/${name}` } },
    });
    const doc = createMagicProxy({
      components: { schemas: { A: recursive('A'), B: recursive('B') } },
      message: {
        headers: { $ref: '#/components/schemas/B' },
        traits: [{ headers: { $ref: '#/components/schemas/A' } }],
      },
    });

    const headers = applyTraits(doc.message as MessageObject).headers as {
      properties: { child: unknown };
    };
    // stops at the schema being merged
    expect(headers.properties.child).toBe(doc.components.schemas.B);
  });
});
