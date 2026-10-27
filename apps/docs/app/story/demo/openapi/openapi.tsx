'use client';
import { preload } from 'react-dom';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { apiHighlighter } from '@/lib/highlighter';

/** the docs' API page, laid out to fit one screen: the response lives in the playground */
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
  content: {
    renderOperationLayout: (slots) => (
      <div className="grid gap-x-6 gap-y-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0">
          {slots.apiPlayground}
          {slots.description}
          {slots.parameters}
        </div>
        <div className="min-w-0">{slots.apiExample}</div>
      </div>
    ),
    renderAPIExampleLayout: (slots) => slots.usageTabs,
  },
});
