import type { AsyncAPIObject } from '@/types';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { dereference, type DereferencedShallow } from '@fumadocs/json-schema';

export interface DereferencedDocument {
  /**
   * document wrapped in a magic proxy (`@scalar/json-magic`).
   *
   * Reference Objects remain in the document, resolve them lazily with {@link resolve}.
   */
  dereferenced: AsyncAPIObject;

  /**
   * Shallowly resolve a Reference Object from the document, merging sibling keywords.
   *
   * Non-reference values are returned as-is.
   */
  resolve: <T>(node: T) => DereferencedShallow<T>;

  bundled: AsyncAPIObject;
}

// documents are read-only, their pages and the UI share one proxy
const cache = new WeakMap<AsyncAPIObject, DereferencedDocument>();

export function dereferenceBundledDocument(bundled: AsyncAPIObject): DereferencedDocument {
  let doc = cache.get(bundled);
  if (!doc) {
    doc = {
      bundled,
      dereferenced: createMagicProxy(bundled as never) as AsyncAPIObject,
      resolve: dereference,
    };
    cache.set(bundled, doc);
  }

  return doc;
}
