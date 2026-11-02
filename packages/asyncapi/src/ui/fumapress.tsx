'use client';
import { preload } from 'react-dom';
import { createAsyncAPIPage } from '@/ui';
import { renderedDocuments } from '@/utils/document/rendered';

/** the page of `asyncapiPlugin()`, the `document` of its props is the URL of a document left out of them */
export const AsyncAPIPage = createAsyncAPIPage({
  async loadDocument(url) {
    if (typeof window !== 'undefined') return (await fetch(url)).json();

    // the browser starts downloading it with the page
    preload(url, { as: 'fetch', crossOrigin: 'anonymous' });
    const document = renderedDocuments().get(url);
    if (!document)
      throw new Error(
        `[Fumadocs AsyncAPI] the document "${url}" is not of a page rendered by \`asyncapiPlugin()\` in this process.`,
      );
    return document;
  },
});
