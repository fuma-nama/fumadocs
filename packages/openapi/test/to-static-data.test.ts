import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { expect, test, vi } from 'vitest';
import type { Document } from '@/types';
import { toStaticData } from '@/utils/pages/to-static-data';

vi.mock('@scalar/json-magic/magic-proxy', () => ({
  createMagicProxy: vi.fn((document: Record<string, unknown>) => document),
}));

test('reuses the magic proxy for the same document', () => {
  const document: Document = {
    openapi: '3.2.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          responses: {},
          summary: 'List users',
        },
      },
    },
  };
  const page = {
    document: 'test',
    operations: [{ path: '/users', method: 'get' as const }],
  };
  const otherDocument = { ...document };

  toStaticData(page, document);
  toStaticData(page, document);
  toStaticData(page, otherDocument);

  expect(createMagicProxy).toHaveBeenCalledTimes(2);
  expect(createMagicProxy).toHaveBeenCalledWith(document);
  expect(createMagicProxy).toHaveBeenCalledWith(otherDocument);
});
