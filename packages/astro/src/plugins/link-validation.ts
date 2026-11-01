import type { FileObject, ScanResult, UrlMeta, ValidateConfig } from 'next-validate-link';
import { publicDir, root, srcDir } from 'virtual:fumadocs/config';
import type { App, Plugin } from '../app';
import { isPageDataOf, trimSlash } from '../shared';
import type { AstroPageData } from '../source';

export type LinkValidationOptions = Omit<ValidateConfig, 'scanned'>;

/**
 * Fail the build on broken links in the content of pages, with `next-validate-link`.
 *
 * Links can point to pages and their headings, routes of plugins, your Astro pages and the files of `public`.
 */
export function linkValidationPlugin(options: LinkValidationOptions = {}): Plugin {
  let validation: Promise<void> | undefined;

  return {
    name: 'link-validation',
    async middleware(context, next) {
      // once per build, before the first prerendered route
      if (!import.meta.env.DEV && context.isPrerendered)
        await (validation ??= validateLinks(this, options));
      return next();
    },
  };
}

async function validateLinks(app: App, options: LinkValidationOptions): Promise<void> {
  // build-only modules, kept out of the server runtime
  const [{ scanURLs, validateFiles }, fs, path] = await Promise.all([
    import('next-validate-link'),
    import('node:fs/promises'),
    import('node:path'),
  ]);
  const scanned: ScanResult = { urls: new Map(), fallbackUrls: [] };
  // with `trailingSlash`, a link has the slash or not
  const add = (url: string, meta: UrlMeta = {}) => {
    const trimmed = trimSlash(url);
    scanned.urls.set(trimmed, meta);
    scanned.urls.set(trimmed.endsWith('/') ? trimmed : `${trimmed}/`, meta);
  };

  for (const route of await app.getRoutes()) add(route.url);
  const files: FileObject[] = [];
  const paths = new Set<string>();
  for (const page of app.getPages()) {
    const { toc } = await app.getPageData(page, await app.getBody(page));
    add(page.url, { hashes: toc.map((item) => item.url.slice(1)) });

    // a file shared by languages is validated once
    if (page.absolutePath && paths.has(page.absolutePath)) continue;
    if (page.absolutePath && isPageDataOf<Pick<AstroPageData, 'getText'>>(page.data, 'getText')) {
      paths.add(page.absolutePath);
      // the source file, errors point to its lines
      const content = await page.data.getText('raw');
      files.push({ path: page.absolutePath, content, url: page.url });
    } else {
      // generated Markdown, like OpenAPI pages
      files.push({ path: `${page.path}.md`, content: await app.getText(page), url: page.url });
    }
  }

  // your Astro pages in `<srcDir>/pages`, without `base`
  const pages = await scanURLs({
    preset: 'astro',
    cwd: path.dirname(srcDir),
    extensions: ['astro', 'md', 'mdx', 'html', 'ts', 'js'],
  });
  for (const [url, meta] of pages.urls) add(app.base + url, meta);
  const base = app.base.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  for (const { url, meta } of pages.fallbackUrls)
    scanned.fallbackUrls.push({ url: new RegExp(`^${base}${url.source.slice(1)}`), meta });
  const assets = await fs.readdir(publicDir, { recursive: true }).catch(() => []);
  for (const file of assets) add(`${app.base}/${file.split(path.sep).join('/')}`);

  const results = await validateFiles(files, {
    checkRelativePaths: 'as-url',
    markdown: { components: { Card: { attributes: ['href'] } } },
    ...options,
    scanned,
  });
  if (results.length === 0) return;
  const lines: string[] = [];
  for (const { file, errors } of results) {
    for (const { url, line, column, reason } of errors)
      lines.push(
        `In "${path.relative(root, path.resolve(root, file))}:${line}:${column}": link "${url}" ${reason instanceof Error ? reason.message : reason}`,
      );
  }
  throw new Error(`[Fumadocs] broken links:\n${lines.join('\n')}`);
}
