'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { preload } from 'react-dom';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

export const OpenAPIPage = createOpenAPIPage({
  shikiOptions: defaultShikiOptions,
  async loadDocument(id) {
    if (typeof window === 'undefined') {
      preload(`/api/openapi/${id}`, { as: 'fetch', crossOrigin: 'anonymous' });
      const { openapi } = await import('@/lib/openapi');
      return (await openapi.getSchema(id)).bundled;
    }
    return (await fetch(`/api/openapi/${id}`)).json();
  },
});
