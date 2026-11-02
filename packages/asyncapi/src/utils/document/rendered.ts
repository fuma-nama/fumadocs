import type { AsyncAPIObject } from '@/types';

// React Server Components render pages and server-render client components in separate module
// graphs, so the documents of rendered pages are shared through `globalThis`
const key = Symbol.for('fumadocs-asyncapi.rendered-documents');

/** documents left out of page props (`includeDocument: false`) for server rendering, by URL */
export function renderedDocuments(): Map<string, AsyncAPIObject> {
  const holder = globalThis as typeof globalThis & { [key]?: Map<string, AsyncAPIObject> };
  return (holder[key] ??= new Map());
}
