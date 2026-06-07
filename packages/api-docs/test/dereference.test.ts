import { dereferenceSync } from '@/schema/dereference';
import { expect, test } from 'vitest';

test('merges $ref target into local schema for sibling keywords', async () => {
  const dereferenced = dereferenceSync({
    openapi: '3.2.0',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {},
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
    },
  } as object);

  const derived = (dereferenced as any).components?.schemas?.Derived;
  expect(derived).toMatchObject({
    type: 'object',
    description: 'local description',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  });
  expect(derived).not.toHaveProperty('$ref');
});
