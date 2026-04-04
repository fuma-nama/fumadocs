import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import type { NoReference } from '../schema';
import { dereferenceSync } from '../schema/dereference';
import type { Document } from '@/types';

export interface DereferencedDocument {
  /**
   * dereferenced document
   */
  dereferenced: NoReference<Document>;

  /**
   * Get raw $ref from dereferenced object
   */
  getRawRef: (obj: object) => string | undefined;

  bundled: Document;
}

export function dereferenceDocument(bundled: Document): DereferencedDocument {
  /**
   * Dereferenced value and its original `$ref` value
   */
  const dereferenceMap = new Map<object, string>();

  return {
    bundled,
    dereferenced: dereferenceSync(bundled as JSONSchema, (schema, ref) => {
      dereferenceMap.set(schema as object, ref);
    }) as NoReference<Document>,
    getRawRef(obj: object) {
      return dereferenceMap.get(obj);
    },
  };
}
