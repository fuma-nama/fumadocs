'use client';
import { preload } from 'react-dom';
import { createAsyncAPIPage } from '@fumadocs/asyncapi/ui';
import { apiHighlighter } from '@/lib/highlighter';

/** the docs' AsyncAPI page, laid out to fit one screen */
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
  content: {
    // the channel and its parameters, a code sample beside them once there is room
    renderOperationLayout: (slots) => (
      <div className="grid gap-x-6 gap-y-4 @xl:grid-cols-2">
        <div className="min-w-0">
          {slots.connection}
          {slots.parameters}
        </div>
        <div className="min-w-0 @max-xl:hidden">{slots.usage}</div>
      </div>
    ),
  },
});
