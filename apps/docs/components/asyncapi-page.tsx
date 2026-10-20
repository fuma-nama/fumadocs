'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { createAsyncAPIPage } from '@fumadocs/asyncapi/ui';

export const AsyncAPIPage = createAsyncAPIPage({
  shikiOptions: defaultShikiOptions,
  async loadDocument(id) {
    if (typeof window === 'undefined') {
      const { asyncapi } = await import('@/lib/asyncapi');
      return (await asyncapi.getSchema(id)).bundled;
    }

    const res = await fetch(`/api/asyncapi/${id}`);
    return res.json();
  },
});
