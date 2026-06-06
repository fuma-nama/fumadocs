import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import type { Document } from '@/types';
import { dereferenceSync } from '@fumadocs/api-docs/schema/dereference';
import type { NoReference } from '@fumadocs/api-docs/schema';

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

export function dereferenceOpenApiDocument(bundled: Document): DereferencedDocument {
  const dereferenceMap = new Map<object, string>();

  return {
    bundled,
    dereferenced: dereferenceSync(bundled as JSONSchema, {
      setOriginalRef(schema, ref) {
        dereferenceMap.set(schema as object, ref);
      },
    }) as NoReference<Document>,
    getRawRef(obj: object) {
      return dereferenceMap.get(obj);
    },
  };
}
