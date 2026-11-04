'use client';
import { createOpenAPIPage } from '@/ui';
import { renderedDocuments } from '@/utils/document/rendered';

/** the page of `openapiPlugin()`, the `document` of its props is the URL of a document left out of them */
export const OpenAPIPage = createOpenAPIPage({
  loadDocument: (url) => renderedDocuments.load(url, (response) => response.json()),
});
