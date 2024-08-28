import { type AnyZodObject, type z } from 'zod';
import { type Collections, defineCollections } from '@/config/collections';
import { frontmatterSchema, metaSchema } from '@/utils/schema';
import type { GetCollectionEntry } from '@/config/types';

export function defineDocs<
  F extends AnyZodObject = typeof frontmatterSchema,
  M extends AnyZodObject = typeof metaSchema,
  DocsOut = GetCollectionEntry<'doc', z.output<F>>,
  MetaOut = GetCollectionEntry<'meta', z.output<M>>,
>(options?: {
  docs?: Partial<Collections<F, 'doc', DocsOut>>;
  meta?: Partial<Collections<M, 'meta', MetaOut>>;
}): {
  docs: Collections<F, 'doc', DocsOut>;
  meta: Collections<M, 'meta', MetaOut>;
} {
  return {
    docs: defineCollections({
      type: 'doc',
      dir: 'content/docs',
      schema: frontmatterSchema as unknown as F,
      ...options?.docs,
    }),
    meta: defineCollections({
      type: 'meta',
      dir: 'content/docs',
      files: ['**/*/meta.json'],
      schema: metaSchema as M,
      ...options?.meta,
    }),
  };
}
