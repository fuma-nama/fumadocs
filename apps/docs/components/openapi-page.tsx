'use client';
import { apiHighlighter } from '@/lib/highlighter';
import { preload } from 'react-dom';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

export const OpenAPIPage = createOpenAPIPage({
  highlighter: apiHighlighter,
  async loadDocument(id) {
    if (typeof window === 'undefined') {
      preload(`/api/openapi/${id}`, { as: 'fetch', crossOrigin: 'anonymous' });
      const { openapi } = await import('@/lib/openapi');
      return (await openapi.getSchema(id)).bundled;
    }
    return (await fetch(`/api/openapi/${id}`)).json();
  },
});
