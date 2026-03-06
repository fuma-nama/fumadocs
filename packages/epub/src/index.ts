import epub, { type Options } from 'epub-gen-memory';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LoaderConfig, Page } from 'fumadocs-core/source';
import { getPagesInTreeOrder } from './toc-builder';
import { markdownToHtml } from './markdown-to-html';
import { defaultEpubStyles } from './default-styles';
import type { EpubExportOptions } from './types';

export { defaultEpubStyles } from './default-styles';
export type { EpubConfig, EpubExportOptions } from './types';

/**
 * Get page directory for resolving relative image paths
 */
function getPageDir(page: Page, cwd: string): string {
  if (page.absolutePath) {
    return path.dirname(page.absolutePath);
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
 *   title: 'My Documentation',
 *   author: 'My Team',
 *   cover: '/cover.png',
 * });
 * ```
 */
export async function exportEpub<C extends LoaderConfig>(
  options: EpubExportOptions<C>,
): Promise<Buffer> {
  const cwd = process.cwd();
  const {
    source,
    getMarkdown = async (page) => {
      try {
        return await (page.data as { getText: (type: string) => Promise<string> }).getText('raw');
      } catch {
        console.warn(
          `Failed to get processed markdown for page "${page.absolutePath ?? page.path}", please specify the "getMarkdown" option.`,
        );
      }
    },
    title,
    author = 'anonymous',
    description,
    language = 'en',
    publisher = 'anonymous',
    cover,
    outputPath,
    includePages,
    excludePages,
    css,
    publicDir = path.resolve('public'),
  } = options;

  // Get pages in tree order (navigation order)
  const pageTree = source.getPageTree();
  const orderedPages = getPagesInTreeOrder(pageTree, (node) => source.getNodePage?.(node)).filter(
    (p): p is Page => p != null,
  );

  // Fallback to getPages() if tree order yields no pages (e.g. i18n)
  const pages = orderedPages.length > 0 ? orderedPages : source.getPages();

  // Filter pages
  const filteredPages = pages.filter((page) => {
    if (includePages && !includePages(page)) return false;
    if (excludePages && excludePages(page)) return false;
    return true;
  });

  const chapters: { title: string; content: string }[] = [];

  for (const page of filteredPages) {
    const markdown = await getMarkdown(page);
    if (!markdown) continue;

    const pageDir = getPageDir(page, cwd);
    const html = await markdownToHtml(markdown, pageDir, publicDir);
    const pageTitle = page.data.title ?? page.slugs[page.slugs.length - 1] ?? 'Untitled';

    chapters.push({
      title: pageTitle,
      content: html,
    });
  }

  const epubOptions: Options = {
    title,
    author: Array.isArray(author) ? author : [author],
    description,
    lang: language,
    publisher,
    cover: resolveCoverPath(cover, cwd, publicDir) ?? cover,
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
