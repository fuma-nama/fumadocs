import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import type { AsyncAPIObject } from '@/types';
import { dereferenceSync } from '@fumadocs/api-docs/schema/dereference';
import type { NoReference } from '@fumadocs/api-docs/schema';

export interface DereferencedDocument {
  /**
   * dereferenced document
   */
  dereferenced: NoReference<AsyncAPIObject>;

  /**
   * Get raw $ref from dereferenced object
   */
  getRawRef: (obj: object) => string | undefined;

  bundled: AsyncAPIObject;
}

export function dereferenceBundledDocument(bundled: AsyncAPIObject): DereferencedDocument {
  const dereferenceMap = new Map<object, string>();

  return {
    bundled,
    dereferenced: dereferenceSync(bundled as JSONSchema, {
      setOriginalRef(schema, ref) {
        dereferenceMap.set(schema as object, ref);
      },
    }) as NoReference<AsyncAPIObject>,
    getRawRef(obj: object) {
      return dereferenceMap.get(obj);
    },
  };
}
