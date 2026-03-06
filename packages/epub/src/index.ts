import epub from 'epub-gen-memory';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Page } from 'fumadocs-core/source';
import { getPagesInTreeOrder } from './toc-builder';
import { markdownToHtml } from './markdown-to-html';
import { resolveImagesInHtml } from './image-resolver';
import { defaultEpubStyles } from './default-styles';
import type { EpubExportOptions } from './types';

export { defaultEpubStyles } from './default-styles';
export type { EpubConfig, EpubExportOptions } from './types';

/**
 * Check if a page has getText (MDX pages do, OpenAPI pages don't)
 */
function hasGetText(
  page: Page,
): page is Page & { data: { getText: (type: string) => Promise<string> } } {
  return typeof (page.data as { getText?: unknown }).getText === 'function';
}

/**
 * Get page directory for resolving relative image paths
 */
function getPageDir(page: Page, cwd: string): string {
  const absolutePath =
    page.absolutePath ?? (page.data as { info?: { fullPath?: string } }).info?.fullPath;
  if (absolutePath) {
    return path.dirname(absolutePath);
  }
  return path.resolve(cwd, path.dirname(page.path));
}

/**
 * Resolve cover image path - support file://, http(s)://, /public/..., or relative
 */
function resolveCoverPath(
  cover: string | undefined,
  cwd: string,
  publicDir?: string,
): string | undefined {
  if (!cover) return undefined;
  if (cover.startsWith('file://') || cover.startsWith('http://') || cover.startsWith('https://'))
    return cover;
  if (cover.startsWith('/')) {
    const base = publicDir ?? path.join(cwd, 'public');
    return pathToFileUrl(path.join(base, cover.slice(1)));
  }
  return pathToFileUrl(path.resolve(cwd, cover));
}

function pathToFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

/**
 * Export Fumadocs documentation to EPUB format.
 *
 * @param options - Export configuration with source and epub config
 * @returns Promise resolving to the EPUB file as a Buffer
 *
 * @example
 * ```ts
 * import { exportEpub } from 'fumadocs-epub';
 * import { source } from '@/lib/source';
 *
 * const buffer = await exportEpub({
 *   source,
 *   config: {
 *     title: 'My Documentation',
 *     author: 'My Team',
 *     cover: '/cover.png',
 *   },
 * });
 * ```
 */
export async function exportEpub(options: EpubExportOptions): Promise<Buffer> {
  const { source, config } = options;
  const {
    title,
    author = 'anonymous',
    description,
    language = 'en',
    publisher = 'anonymous',
    isbn,
    cover,
    outputPath,
    includePages,
    excludePages,
    css,
    publicDir,
  } = config;

  const cwd = process.cwd();

  // Get pages in tree order (navigation order)
  const pageTree = source.getPageTree();
  const orderedPages = getPagesInTreeOrder(pageTree, (node) => source.getNodePage?.(node)).filter(
    (p): p is Page => p != null,
  );

  // Fallback to getPages() if tree order yields no pages (e.g. i18n)
  const pages = orderedPages.length > 0 ? orderedPages : source.getPages();

  // Filter pages
  const filteredPages = pages.filter((page) => {
    if (!hasGetText(page)) return false;
    if (includePages && !includePages(page)) return false;
    if (excludePages && excludePages(page)) return false;
    return true;
  });

  const chapters: { title: string; content: string }[] = [];

  const resolvedPublicDir = publicDir ?? path.join(cwd, 'public');

  for (const page of filteredPages) {
    let markdown: string;
    try {
      markdown = await (page.data as { getText: (type: string) => Promise<string> }).getText(
        'processed',
      );
    } catch (err) {
      const pageId = page.data.title ?? page.slugs?.slice(-1)[0] ?? page.path;
      throw new Error(
        `Failed to get processed markdown for page "${pageId}": ${err instanceof Error ? err.message : String(err)}. Ensure includeProcessedMarkdown: true in your docs collection config.`,
      );
    }
    const html = await markdownToHtml(markdown);
    const pageDir = getPageDir(page, cwd);
    const resolvedHtml = resolveImagesInHtml(html, pageDir, resolvedPublicDir);

    const pageTitle = page.data.title ?? page.slugs?.slice(-1)[0] ?? 'Untitled';

    chapters.push({
      title: pageTitle,
      content: resolvedHtml,
    });
  }

  const epubOptions = {
    title,
    author: Array.isArray(author) ? author : [author],
    description,
    lang: language,
    publisher,
    isbn,
    cover: resolveCoverPath(cover, cwd, resolvedPublicDir) ?? cover,
    css: css ?? defaultEpubStyles,
    prependChapterTitles: true,
    numberChaptersInTOC: true,
    tocTitle: 'Table of Contents',
  };

  const content = chapters.map((ch) => ({
    title: ch.title,
    content: ch.content,
  }));

  const buffer = await epub(epubOptions, content);

  if (outputPath) {
    const fs = await import('node:fs/promises');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
  }
  return buffer;
}
