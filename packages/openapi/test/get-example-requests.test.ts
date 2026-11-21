import { describe, expect, test } from 'vitest';
import { pathnameFromRequest } from '@/requests/generators';
import { defaultAdapters } from '@/requests/media/adapter';
import type { ParameterObject, RequestBodyObject } from '@/types';
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

  const body = (examples: Record<string, { value: unknown }>): RequestBodyObject => ({
    content: {
      'application/json': { schema: { type: 'object' }, examples },
    },
  });

  const requests = (requestBody: RequestBodyObject) =>
    getExampleRequests({
      path: '/pets/{petId}',
      method: 'put',
      requestBody,
      parameters: [petId],
      mediaAdapters: defaultAdapters,
    });

  const pathnames = (requestBody: RequestBodyObject) =>
    requests(requestBody).map((item) => [
      item.id,
      pathnameFromRequest('/pets/{petId}', item.encoded),
    ]);

  test('uses the parameter example with the same key as the request body example', () => {
    expect(pathnames(body({ cat: { value: {} }, dog: { value: {} }, '': { value: {} } }))).toEqual([
      ['cat', '/pets/tom'],
      ['dog', '/pets/rex'],
      ['', '/pets/nemo'],
    ]);
  });

  test('uses the request body example under an empty key', () => {
    const [item] = requests(body({ '': { value: { name: 'nemo' } } }));
    expect(item.data.body).toEqual({ name: 'nemo' });
  });

  test('falls back to the first parameter example without a matching key', () => {
    // an inherited property such as `constructor` is not a parameter example
    expect(pathnames(body({ bird: { value: {} }, constructor: { value: {} } }))).toEqual([
      ['bird', '/pets/tom'],
      ['constructor', '/pets/tom'],
    ]);
  });

  test('request bodies leave out read-only properties for every method', () => {
    for (const method of ['get', 'query', 'post'] as const) {
      const [item] = getExampleRequests({
        path: '/search',
        method,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'q', 'secret'],
                properties: {
                  id: { type: 'string', readOnly: true },
                  q: { type: 'string' },
                  secret: { type: 'string', writeOnly: true },
                },
              },
            },
          },
        },
        parameters: [],
        mediaAdapters: defaultAdapters,
      });
      expect(Object.keys(item.data.body as object)).toEqual(['q', 'secret']);
    }
  });
});
