import { processDocument } from '@/utils/process-document';
import { expect, test } from 'vitest';

test('merges $ref target into local schema for sibling keywords', async () => {
  const result = await processDocument({
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
    } as object,
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
