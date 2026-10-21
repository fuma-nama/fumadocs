import { describe, expect, test } from 'vitest';
import { pathnameFromRequest } from '@/requests/generators';
import { defaultAdapters } from '@/requests/media/adapter';
import type { OperationObject, ParameterObject } from '@/types';
import { getExampleRequests } from '@/utils/get-example-requests';

describe('getExampleRequests', () => {
  const petId: ParameterObject = {
    name: 'petId',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    examples: {
      cat: { value: 'tom' },
      dog: { value: 'rex' },
    },
  };

  const operation = (examples: Record<string, { value: unknown }>): OperationObject => ({
    parameters: [petId],
    requestBody: {
      content: {
        'application/json': { schema: { type: 'object' }, examples },
      },
    },
    responses: {},
  });

  const pathnames = (op: OperationObject) =>
    getExampleRequests({
      path: '/pets/{petId}',
      method: 'put',
      operation: op,
      parameters: [petId],
      mediaAdapters: defaultAdapters,
    }).map((item) => [item.id, pathnameFromRequest('/pets/{petId}', item.encoded)]);

  test('uses the parameter example with the same key as the request body example', () => {
    expect(pathnames(operation({ cat: { value: {} }, dog: { value: {} } }))).toEqual([
      ['cat', '/pets/tom'],
      ['dog', '/pets/rex'],
    ]);
  });

  test('falls back to the first parameter example without a matching key', () => {
    expect(pathnames(operation({ bird: { value: {} } }))).toEqual([['bird', '/pets/tom']]);
  });
});
