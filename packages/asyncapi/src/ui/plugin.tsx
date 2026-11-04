'use client';
import { createAsyncAPIPage } from '@/ui';
import { renderedDocuments } from '@/utils/document/rendered';
import type { AsyncAPIObject } from '@/types';

/** `loadDocument` of the page of `asyncapiPlugin()`: on the server, it reads documents of the pages rendered in the process */
export function loadDocument(url: string): Promise<AsyncAPIObject> {
  return renderedDocuments.load(url, (response) => response.json());
}

/** the page of `asyncapiPlugin()`, the `document` of its props is the URL of a document left out of them */
export const AsyncAPIPage = createAsyncAPIPage({ loadDocument });
