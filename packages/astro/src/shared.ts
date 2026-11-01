import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { AnyPage, App } from './app';

/** the key in `remarkPluginFrontmatter` holding {@link FumadocsData} */
export const dataKey = '_fumadocs';

export interface FumadocsData {
  toc: TOCItemType[];
  structuredData: StructuredData;
  /** with `includeProcessedMarkdown` */
  markdown?: string;
  /** with `output: 'function'`, the key of its function output in `registerMarkdown()` */
  markdownId?: string;
}

/** `getText('processed')` without `includeProcessedMarkdown` */
export class NoProcessedMarkdownError extends Error {
  constructor() {
    super(
      "getText('processed') requires `includeProcessedMarkdown` in the options of the Fumadocs integration.",
    );
  }
}

/** a node of the island tree, see `island-plugin.ts` for MDX, and `island-node.tsx` for React content */
export type IslandNode =
  | string
  | { $slot: string }
  | [tagName: string, properties: Record<string, unknown> | 0, ...children: IslandNode[]]
  | [jsx: 1, name: string | null, props: Record<string, unknown>, ...children: IslandNode[]];

const loaded = new WeakMap<object, Promise<unknown>>();

/** `load()` of a page from a content source, once per page except in dev, where content changes */
export function loadOnce<T>(data: { load: () => Promise<T> }): Promise<T> {
  if (import.meta.env.DEV) return data.load();
  let result = loaded.get(data) as Promise<T> | undefined;
  if (!result) loaded.set(data, (result = data.load()));
  return result;
}

/** with `trailingSlash`, a URL matches with or without the slash */
export function trimSlash(url: string): string {
  return url.replace(/(.)\/$/, '$1');
}

/** the URL of a page without `base` and the trailing slash, `''` for the root, for the files of pages like `<path>.md` */
export function pagePath(app: App, page: AnyPage): string {
  return app.toPath(page.url).replace(/\/$/, '');
}

/** the Markdown of a page for LLMs, with its title and URL */
export async function pageMarkdown(app: App, page: AnyPage): Promise<string> {
  return `# ${(await app.getPageData(page)).title} (${page.url})

${await app.getText(page)}`;
}

/** the page data of an integration, by one of its methods like `getOpenAPIPageProps()` */
export function isPageDataOf<T extends object>(data: object, method: keyof T): data is T {
  return typeof (data as T)[method] === 'function';
}
