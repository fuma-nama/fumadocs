import type { ApiRoute } from 'fumadocs-core/framework/plugin';
import { preload } from 'react-dom';

/**
 * Documents left out of page props (like `includeDocument: false`) for server rendering, by URL: page props have the URL, the browser fetches it.
 *
 * @param plugin - the name of the plugin function, like `openapiPlugin`
 */
export function createRenderedDocuments<Document>(plugin: string) {
  // React Server Components render pages and server-render client components in separate module
  // graphs, so the documents of rendered pages are shared through `globalThis`
  const key = Symbol.for(`fumadocs.${plugin}.rendered-documents`);
  const holder = globalThis as typeof globalThis & Record<symbol, Map<string, Document>>;
  const documents = () => (holder[key] ??= new Map());

  return {
    set(url: string, document: Document) {
      documents().set(url, document);
    },
    /** for `loadDocument` of the page component, `read` the response of the URL in the browser */
    async load(url: string, read: (response: Response) => Promise<Document>): Promise<Document> {
      if (typeof window !== 'undefined') return read(await fetch(url));

      // the browser starts downloading it with the page
      preload(url, { as: 'fetch', crossOrigin: 'anonymous' });
      const document = documents().get(url);
      if (document === undefined)
        throw new Error(
          `the document "${url}" is not of a page rendered by \`${plugin}()\` in this process.`,
        );
      return document;
    },
  };
}

/** the route serving the document of each ID at `<path>/[id]` */
export async function documentsRoute<Schema>({
  path,
  getSchemas,
  toResponse,
}: {
  path: string;
  getSchemas: () => Promise<Record<string, Schema>>;
  toResponse: (schema: Schema) => Response;
}): Promise<ApiRoute> {
  return {
    path: `${path}/[id]`,
    staticPaths: Object.keys(await getSchemas()),
    async GET(_, { params: { id } }) {
      const schemas = await getSchemas();
      if (typeof id === 'string' && Object.hasOwn(schemas, id)) return toResponse(schemas[id]);
      return new Response('Not Found', { status: 404 });
    },
  };
}
