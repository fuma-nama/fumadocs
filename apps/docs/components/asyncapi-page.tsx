'use client';
import { apiHighlighter } from '@/lib/highlighter';
import { preload } from 'react-dom';
import { createAsyncAPIPage } from '@fumadocs/asyncapi/ui';

export const AsyncAPIPage = createAsyncAPIPage({
  highlighter: apiHighlighter,
  async loadDocument(id) {
    if (typeof window === 'undefined') {
      preload(`/api/asyncapi/${id}`, { as: 'fetch', crossOrigin: 'anonymous' });
      const { asyncapi } = await import('@/lib/asyncapi');
      return (await asyncapi.getSchema(id)).bundled;
    }
    return (await fetch(`/api/asyncapi/${id}`)).json();
  },
});
