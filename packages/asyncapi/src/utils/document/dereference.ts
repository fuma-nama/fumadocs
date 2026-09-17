import type { AsyncAPIObject } from '@/types';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import type { NoReferenceSwallow } from '@fumadocs/api-docs/schema';

export interface DereferencedDocument {
  /**
   * document wrapped in a magic proxy (`@scalar/json-magic`).
   *
   * Reference Objects remain in the document — resolve them lazily with {@link resolve}.
   */
  dereferenced: AsyncAPIObject;

  /**
   * Shallowly resolve a Reference Object from the document, merging sibling keywords.
   *
   * Non-reference values are returned as-is.
   */
  resolve: <T>(node: T) => NoReferenceSwallow<T>;

  bundled: AsyncAPIObject;
}

// documents are read-only, pages of the same document share one proxy
const cache = new WeakMap<AsyncAPIObject, DereferencedDocument>();

export function dereferenceBundledDocument(bundled: AsyncAPIObject): DereferencedDocument {
  const cached = cache.get(bundled);
  if (cached) return cached;

  const doc: DereferencedDocument = {
    bundled,
    dereferenced: createMagicProxy(bundled as never) as AsyncAPIObject,
    resolve(node) {
      return dereferenceShallow(node);
    },
  };

  cache.set(bundled, doc);
  return doc;
}
