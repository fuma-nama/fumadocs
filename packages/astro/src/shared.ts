import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Page } from 'fumadocs-core/source';
import type { App } from './app';

/** `base` of Astro without the trailing slash, `''` for the root, at runtime: the integration imports this module without `import.meta.env` */
export function getBase(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

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
export function pagePath(app: App, page: Page): string {
  return app.toPath(page.url).replace(/\/$/, '');
}

/** the Markdown of a page for LLMs, with its title and URL */
export async function pageMarkdown(app: App, page: Page): Promise<string> {
  return `# ${(await app.getPageData(page)).title} (${page.url})

${await app.getText(page)}`;
}

/** the page data of an integration, by one of its methods like `getOpenAPIPageProps()` */
export function isPageDataOf<T extends object>(data: object, method: keyof T): data is T {
  return typeof (data as T)[method] === 'function';
}
