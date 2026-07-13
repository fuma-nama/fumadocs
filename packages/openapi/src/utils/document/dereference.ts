import type { Document } from '@/types';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import type { NoReferenceSwallow } from '@fumadocs/api-docs/schema';

export interface DereferencedDocument {
  /**
   * document wrapped in a magic proxy (`@scalar/json-magic`).
   *
   * Reference Objects remain in the document — resolve them lazily with {@link resolve}.
   */
  dereferenced: Document;

  /**
   * Shallowly resolve a Reference Object from the document, merging sibling keywords.
   *
   * Non-reference values are returned as-is.
   */
  resolve: <T>(node: T) => NoReferenceSwallow<T>;

  bundled: Document;
}

export function dereferenceBundledDocument(bundled: Document): DereferencedDocument {
  return {
    bundled,
    dereferenced: createMagicProxy(bundled as Record<string, unknown>) as Document,
    resolve(node) {
      return dereferenceShallow(node);
    },
  };
}
