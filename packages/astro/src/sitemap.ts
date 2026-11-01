import { createReadStream } from 'node:fs';
import path from 'node:path';

/** where the built pages are, set by the integration */
export const output: { dir?: string; base: string } = { base: '' };

/** an item of `@astrojs/sitemap` */
interface SitemapItem {
  url: string;
  lastmod?: string;
  links?: { url: string; lang: string }[];
}

/**
 * The `serialize` option of `@astrojs/sitemap`, items follow the `<head>` of built pages, like docs pages:
 *
 * - `lastmod` from `<meta property="article:modified_time">`.
 * - Language alternates from `<link rel="alternate" hreflang>`.
 * - Pages with `<meta name="robots" content="noindex">` are left out, like pages shown in the fallback language.
 */
export async function serializeSitemap<Item extends SitemapItem>(
  item: Item,
): Promise<Item | undefined> {
  const head = await readHead(item.url);
  if (!head) return item;

  let lastmod = item.lastmod;
  const links: { url: string; lang: string }[] = [];
  for (const [, tag, attributes] of head.matchAll(/<(meta|link)\s([^>]*)>/g)) {
    const attrs: Record<string, string> = {};
    for (const [, name, value] of attributes.matchAll(/([\w:-]+)="([^"]*)"/g))
      attrs[name] = decode(value);

    if (tag === 'link') {
      if (attrs.rel === 'alternate' && attrs.hreflang && attrs.href)
        links.push({ url: attrs.href, lang: attrs.hreflang });
    } else if (attrs.name === 'robots' && attrs.content?.includes('noindex')) {
      return;
    } else if (attrs.property === 'article:modified_time') {
      lastmod = attrs.content;
    }
  }
  return { ...item, lastmod, links: links.length > 0 ? links : item.links };
}

/** the `<head>` of the HTML file at a URL, `undefined` when it isn't a built page */
async function readHead(url: string): Promise<string | undefined> {
  if (!output.dir) return;
  let pathname = decodeURI(new URL(url).pathname);
  if (pathname !== output.base && !pathname.startsWith(`${output.base}/`)) return;
  pathname = pathname.slice(output.base.length).replace(/\/$/, '');

  // the files of `build.format`
  for (const file of [`${pathname}/index.html`, `${pathname}.html`]) {
    let html = '';
    try {
      for await (const chunk of createReadStream(path.join(output.dir, file), 'utf8')) {
        html += chunk;
        const end = html.indexOf('</head>');
        if (end !== -1) return html.slice(0, end);
      }
      return html;
    } catch {
      // not this file
    }
  }
}

function decode(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#34|#39);/g, (_, entity: string) => entities[entity]);
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#34': '"',
  '#39': "'",
};
