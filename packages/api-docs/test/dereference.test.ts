import { dereferenceShallow } from '@/schema/dereference';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { expect, test } from 'vitest';

const doc = createMagicProxy({
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
          self: { $ref: '#/components/schemas/Base' },
        },
        required: ['id'],
      },
      Derived: {
        $ref: '#/components/schemas/Base',
        description: 'local description',
      },
      Alias: {
        $ref: '#/components/schemas/Derived',
      },
    },
  },
}) as any;

test('dereferenceShallow: merges $ref target into local schema for sibling keywords', () => {
  const derived = dereferenceShallow(doc.components.schemas.Derived);

  expect(derived).toMatchObject({
    type: 'object',
    description: 'local description',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  });
  expect(derived).not.toHaveProperty('$ref');
  // the virtual property of magic proxies must not be merged
  expect(derived).not.toHaveProperty('$ref-value');
});

test('dereferenceShallow: follows chained refs', () => {
  const alias = dereferenceShallow(doc.components.schemas.Alias);

  expect(alias).toMatchObject({
    type: 'object',
    // no sibling `description` on Alias, Derived's wins
    description: 'local description',
  });
});
