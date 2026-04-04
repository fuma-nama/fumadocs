import type { Document } from '@/types';
import { bundle } from '@scalar/json-magic/bundle';
import { upgrade } from '@scalar/openapi-upgrader';
import { fetchUrls, readFiles } from '@scalar/json-magic/bundle/plugins/node';
import { dereferenceDocument, type DereferencedDocument } from './dereference';

export type ProcessedDocument = DereferencedDocument;

/**
 * process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(input: string | Document): Promise<ProcessedDocument> {
  const bundled: Document = await bundle(input, {
    plugins: [fetchUrls(), readFiles()],
    treeShake: true,
    hooks: {
      onResolveError(node) {
        throw new Error(`Failed to resolve ${node.$ref}`);
      },
    },
  })
    .then((v) => upgrade(v as never, '3.2') as Document)
    .catch((e) => {
      throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
        cause: e,
      });
    });
  return dereferenceDocument(bundled);
}
