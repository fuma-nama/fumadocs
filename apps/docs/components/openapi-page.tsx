'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

export const OpenAPIPage = createOpenAPIPage({
  shikiOptions: defaultShikiOptions,
  async loadDocument(id) {
    if (typeof window === 'undefined') {
      const { openapi } = await import('@/lib/openapi');
      return (await openapi.getSchema(id)).bundled;
    }

    const res = await fetch(`/api/openapi/${id}`);
    return res.json();
  },
});
