import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import type { NoReference } from '../schema';
import { dereferenceSync } from '../schema/dereference';
import type { Document } from '@/types';
import type { AsyncAPIObject } from '@/types/asyncapi-3';
import { isMandatoryAsyncApiV3Ref } from './asyncapi-refs';

export interface DereferencedDocument<T = Document> {
  /**
   * dereferenced document
   */
  dereferenced: NoReference<T>;

  /**
   * Get raw $ref from dereferenced object
   */
  getRawRef: (obj: object) => string | undefined;

  bundled: T;
}

export interface DereferencedAsyncApiDocument {
  /**
   * dereferenced document — mandatory AsyncAPI 3 refs may remain as Reference Objects
   */
  dereferenced: AsyncAPIObject;

  /**
   * Get raw $ref from dereferenced object
   */
  getRawRef: (obj: object) => string | undefined;

  bundled: AsyncAPIObject;
}

function createDereferencedDocument<T extends object>(
  bundled: T,
  preserveRef?: (pointer: string) => boolean,
): DereferencedDocument<T> | DereferencedAsyncApiDocument {
  const dereferenceMap = new Map<object, string>();

  return {
    bundled,
    dereferenced: dereferenceSync(bundled as JSONSchema, {
      preserveRef,
      setOriginalRef(schema, ref) {
        dereferenceMap.set(schema as object, ref);
      },
    }) as NoReference<T>,
    getRawRef(obj: object) {
      return dereferenceMap.get(obj);
    },
  };
}

export function dereferenceOpenApiDocument(bundled: Document): DereferencedDocument {
  return createDereferencedDocument(bundled) as DereferencedDocument;
}

export function dereferenceAsyncApiDocument(bundled: AsyncAPIObject): DereferencedAsyncApiDocument {
  return createDereferencedDocument(
    bundled,
    isMandatoryAsyncApiV3Ref,
  ) as DereferencedAsyncApiDocument;
}
