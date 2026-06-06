import { expect, test } from 'vitest';
import { processAsyncApiDocument } from '@/utils/document/process-asyncapi';
import { isMandatoryAsyncApiV3Ref } from '@/utils/document/asyncapi-refs';
import type { AsyncAPIObject } from '@/types/asyncapi-3';

const baseDocument: AsyncAPIObject = {
  asyncapi: '3.0.0',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
};

test('isMandatoryAsyncApiV3Ref matches spec-required locations', () => {
  expect(isMandatoryAsyncApiV3Ref('#/operations/foo/channel')).toBe(true);
  expect(isMandatoryAsyncApiV3Ref('#/operations/foo/messages/0')).toBe(true);
  expect(isMandatoryAsyncApiV3Ref('#/components/schemas/User')).toBe(false);
});

test('rejects non-AsyncAPI 3 documents', async () => {
  await expect(
    processAsyncApiDocument({
      asyncapi: '2.6.0',
      info: { title: 'Test', version: '1.0.0' },
    }),
  ).rejects.toThrow('[AsyncAPI] Expected AsyncAPI 3.x');
});

test('dereferences schemas while preserving mandatory operation refs', async () => {
  const result = await processAsyncApiDocument({
    ...baseDocument,
    channels: {
      userSignedUp: {
        address: 'user/signedup',
        messages: {
          userSignedUp: {
            payload: {
              $ref: '#/components/schemas/UserSignedUp',
            },
          },
        },
      },
    },
    operations: {
      onUserSignedUp: {
        action: 'receive',
        channel: {
          $ref: '#/channels/userSignedUp',
        },
        messages: [{ $ref: '#/channels/userSignedUp/messages/userSignedUp' }],
      },
    },
    components: {
      schemas: {
        UserSignedUp: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        } as object,
      },
    },
  });

  const operation = result.dereferenced.operations?.onUserSignedUp;
  expect(operation && 'channel' in operation && operation.channel).toEqual({
    $ref: '#/channels/userSignedUp',
  });
  expect(operation && 'messages' in operation && operation.messages).toEqual([
    { $ref: '#/channels/userSignedUp/messages/userSignedUp' },
  ]);

  const channel = result.dereferenced.channels?.userSignedUp;
  const message =
    channel && 'messages' in channel ? channel.messages?.userSignedUp : undefined;
  const payload = message && 'payload' in message ? message.payload : undefined;
  expect(payload).toMatchObject({
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
  });
  expect(payload).not.toHaveProperty('$ref');
});

test('merges $ref target into local schema for sibling keywords', async () => {
  const result = await processAsyncApiDocument({
    ...baseDocument,
    components: {
      schemas: {
        Base: {
          type: 'object',
          description: 'base description',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        Derived: {
          $ref: '#/components/schemas/Base',
          description: 'local description',
        },
      },
    } as AsyncAPIObject['components'],
  });

  const derived = result.dereferenced.components?.schemas?.Derived as Record<string, unknown>;
  expect(derived).toMatchObject({
    type: 'object',
    description: 'local description',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  });
  expect(derived).not.toHaveProperty('$ref');
  expect(result.getRawRef(derived)).toBe('#/components/schemas/Base');
});
