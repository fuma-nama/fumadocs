import { expect, test } from 'vitest';
import {
  getMessagePayload,
  resolveOperation,
  resolveOperationMessages,
} from '@/ui/asyncapi/resolve';
import type { AsyncAPIObject } from '@/types/asyncapi-3';

const document: AsyncAPIObject = {
  asyncapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  channels: {
    userSignedUp: {
      address: 'user/signedup',
      messages: {
        userSignedUp: {
          payload: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
            },
          },
        },
      },
    },
  },
  operations: {
    onUserSignedUp: {
      action: 'receive',
      channel: { $ref: '#/channels/userSignedUp' },
      messages: [{ $ref: '#/channels/userSignedUp/messages/userSignedUp' }],
    },
  },
};

test('resolveOperation resolves mandatory refs for display', () => {
  const operation = resolveOperation(document, 'onUserSignedUp');
  expect(operation?.action).toBe('receive');

  const messages = resolveOperationMessages(document, operation!);
  expect(getMessagePayload(messages[0]!)).toMatchObject({
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
  });
});
