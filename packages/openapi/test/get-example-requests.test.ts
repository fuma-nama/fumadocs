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
      '': { value: 'nemo' },
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
    expect(
      pathnames(operation({ cat: { value: {} }, dog: { value: {} }, '': { value: {} } })),
    ).toEqual([
      ['cat', '/pets/tom'],
      ['dog', '/pets/rex'],
      ['', '/pets/nemo'],
    ]);
  });

  test('falls back to the first parameter example without a matching key', () => {
    // an inherited property such as `constructor` is not a parameter example
    expect(pathnames(operation({ bird: { value: {} }, constructor: { value: {} } }))).toEqual([
      ['bird', '/pets/tom'],
      ['constructor', '/pets/tom'],
    ]);
  });
});
