'use client';
import { createOpenAPIPage } from '@/ui';
import { renderedDocuments } from '@/utils/document/rendered';
import type { Document } from '@/types';

/** `loadDocument` of the page of `openapiPlugin()`: on the server, it reads documents of the pages rendered in the process */
export function loadDocument(url: string): Promise<Document> {
  return renderedDocuments.load(url, (response) => response.json());
}

/** the page of `openapiPlugin()`, the `document` of its props is the URL of a document left out of them */
export const OpenAPIPage = createOpenAPIPage({ loadDocument });
