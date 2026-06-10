import { describe, expect, test } from 'vitest';
import { applyMessageTraits, applyOperationTraits, mergeTraits } from '@/utils/traits';
import type { NoReference } from '@fumadocs/api-docs/schema';
import type { MessageObject, OperationObject } from '@/types/asyncapi-3';

describe('mergeTraits', () => {
  test('fills missing properties without overriding target', () => {
    expect(
      mergeTraits({ description: 'Operation description' }, [
        { name: 'UserSignup', description: 'Trait description' },
        { tags: [{ name: 'user' }] },
      ]),
    ).toEqual({
      description: 'Operation description',
      name: 'UserSignup',
      tags: [{ name: 'user' }],
    });
  });

  test('deep merges nested objects like bindings', () => {
    expect(
      mergeTraits({ bindings: { kafka: { groupId: { type: 'string' } } } }, [
        { bindings: { kafka: { clientId: { type: 'string' } }, http: { method: 'POST' } } },
      ]),
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

  test('does not override existing nested binding fields', () => {
    expect(
      mergeTraits({ bindings: { kafka: { groupId: 'from-operation' } } }, [
        { bindings: { kafka: { groupId: 'from-trait', clientId: 'from-trait' } } },
      ]),
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

describe('applyOperationTraits', () => {
  test('merges operation traits', () => {
    const operation = applyOperationTraits({
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
    } as NoReference<OperationObject>);

    expect(operation.traits).toBeUndefined();
    expect(operation.bindings).toEqual({
      kafka: {
        groupId: { type: 'string', enum: ['my-group'] },
        clientId: { type: 'string', enum: ['shared-client'] },
      },
    });
  });
});

describe('applyMessageTraits', () => {
  test('merges message traits into existing headers', () => {
    const message = applyMessageTraits({
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
    } as NoReference<MessageObject>);

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
    const message = applyMessageTraits({
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
    } as NoReference<MessageObject>);

    expect(message.headers).toEqual({
      type: 'object',
      properties: {
        'content-type': { type: 'string' },
      },
    });
  });
});
