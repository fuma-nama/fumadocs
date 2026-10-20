'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { preload } from 'react-dom';
import { createAsyncAPIPage } from '@fumadocs/asyncapi/ui';

export const AsyncAPIPage = createAsyncAPIPage({
  shikiOptions: defaultShikiOptions,
  async loadDocument(id) {
    if (typeof window === 'undefined') {
      preload(`/api/asyncapi/${id}`, { as: 'fetch', crossOrigin: 'anonymous' });
      const { asyncapi } = await import('@/lib/asyncapi');
      return (await asyncapi.getSchema(id)).bundled;
    }
    return (await fetch(`/api/asyncapi/${id}`)).json();
  },
});
