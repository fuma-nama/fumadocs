'use client';
import { preload } from 'react-dom';
import { createOpenAPIPage } from '@/ui';
import { renderedDocuments } from '@/utils/document/rendered';

/** the page of `openapiPlugin()`, the `document` of its props is the URL of a document left out of them */
export const OpenAPIPage = createOpenAPIPage({
  async loadDocument(url) {
    if (typeof window !== 'undefined') return (await fetch(url)).json();

    // the browser starts downloading it with the page
    preload(url, { as: 'fetch', crossOrigin: 'anonymous' });
    const document = renderedDocuments().get(url);
    if (!document)
      throw new Error(
        `[Fumadocs OpenAPI] the document "${url}" is not of a page rendered by \`openapiPlugin()\` in this process.`,
      );
    return document;
  },
});
