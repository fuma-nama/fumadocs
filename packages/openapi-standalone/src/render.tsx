import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prerender } from 'react-dom/static';
import { deserializePageTree } from 'fumadocs-core/source/client';
import type { Document } from 'fumadocs-openapi';
import { App, normalizePathname } from './app';
import type { SiteData } from './app/types';

/** what pages render from, as JSON: the same data the browser fetches, and workers receive it as is */
export interface RenderInput {
  /** the site data, served at `siteUrl` */
  site: string;
  siteUrl: string;
  /** bundled documents by name */
  documents: Record<string, string>;
  /** URL of the client script */
  entryUrl: string;
}

export type Render = (pathname: string) => Promise<{ status: 200 | 404; html: string }>;

export function createRenderer(input: RenderInput): Render {
  const site: SiteData = JSON.parse(input.site);
  const tree = deserializePageTree(site.tree);
  const documents = new Map<string, Document>();
  for (const [name, json] of Object.entries(input.documents)) documents.set(name, JSON.parse(json));
  const router = { push() {}, refresh() {} };
  const bootstrapScriptContent = `globalThis.__fumadocs=${JSON.stringify(input.siteUrl).replaceAll('<', '\\u003c')}`;

  return async (pathname) => {
    pathname = normalizePathname(pathname);
    const page = site.pages[pathname];
    const preloads = [input.siteUrl];
    if (page?.type === 'api') preloads.push(site.documents[page.props.document]);

    const { prelude } = await prerender(
      <App
        site={site}
        tree={tree}
        pathname={pathname}
        router={router}
        getDocument={(name) => documents.get(name)!}
        preloads={preloads}
      />,
      { bootstrapModules: [input.entryUrl], bootstrapScriptContent },
    );

    return { status: page ? 200 : 404, html: await new Response(prelude).text() };
  };
}

/** render each pathname into its file */
export async function renderToFiles(input: RenderInput, pages: [pathname: string, file: string][]) {
  const render = createRenderer(input);
  for (const [pathname, file] of pages) await write(file, (await render(pathname)).html);
}

export async function write(file: string, content: string) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}
