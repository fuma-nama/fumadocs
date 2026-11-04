'use client';
import { createAsyncAPIPage } from '@/ui';
import { renderedDocuments } from '@/utils/document/rendered';

/** the page of `asyncapiPlugin()`, the `document` of its props is the URL of a document left out of them */
export const AsyncAPIPage = createAsyncAPIPage({
  loadDocument: (url) => renderedDocuments.load(url, (response) => response.json()),
});
