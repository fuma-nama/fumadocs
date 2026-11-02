import { js2xml, type ElementCompact } from 'xml-js';
import type { Context } from '../context';
import type { AppShape, Awaitable, Plugin } from '../plugin';

/**
 * An `<item>` entry of the RSS feed.
 *
 * @see https://www.rssboard.org/rss-specification#hrelementsOfLtitemgt
 */
export interface RSSItem {
  title: string;

  /** fully-qualified URL of the item */
  link: string;

  description?: string;

  /** publication date of the item */
  pubDate?: Date | string;

  /**
   * unique identifier of the item
   *
   * @defaultValue link
   */
  guid?: string;

  /** email address of the author */
  author?: string;

  categories?: string[];
}

export interface RSSChannel {
  title: string;
  /** fully-qualified URL of the site */
  link: string;
  description: string;
  language?: string;
  /** fully-qualified URL of the feed itself */
  selfUrl?: string;
  items: RSSItem[];
}

export interface RSSOptions<C extends AppShape = AppShape> extends Partial<
  Pick<RSSChannel, 'title' | 'description' | 'language'>
> {
  /**
   * path of the feed route
   *
   * @defaultValue "/rss.xml"
   */
  path?: string;

  /**
   * max number of items in the feed
   *
   * @defaultValue 20
   */
  limit?: number;

  /**
   * add a `<link rel="alternate">` tag to every page for feed discovery
   *
   * @defaultValue true
   */
  alternateLink?: boolean;

  /**
   * Customize or exclude feed items, return `undefined` to exclude a page.
   *
   * By default, includes pages with a creation date (or modified date as fallback), resolved from content sources.
   */
  getItem?: (this: Context<C>, page: C['page']) => Awaitable<RSSItem | undefined>;

  /** additional items of the feed, their `link` must be a fully-qualified URL */
  additionalItems?: RSSItem[] | ((this: Context<C>) => Awaitable<RSSItem[]>);
}

function toTime(value: Date | string | undefined): number {
  if (value === undefined) return 0;
  return (value instanceof Date ? value : new Date(value)).getTime();
}

function itemToElement(item: RSSItem): ElementCompact {
  const element: ElementCompact = {
    title: { _text: item.title },
    link: { _text: item.link },
    guid: { _text: item.guid ?? item.link },
  };

  if (item.description) element.description = { _text: item.description };
  if (item.pubDate) element.pubDate = { _text: new Date(toTime(item.pubDate)).toUTCString() };
  if (item.author) element.author = { _text: item.author };
  if (item.categories?.length)
    element.category = item.categories.map((category) => ({ _text: category }));

  return element;
}

/** the XML of an RSS 2.0 feed */
export function buildRSS(channel: RSSChannel): string {
  const element: ElementCompact = {
    title: { _text: channel.title },
    link: { _text: channel.link },
    description: { _text: channel.description },
  };

  if (channel.language) element.language = { _text: channel.language };
  let lastBuild = 0;
  for (const item of channel.items) lastBuild = Math.max(lastBuild, toTime(item.pubDate));
  if (lastBuild > 0) element.lastBuildDate = { _text: new Date(lastBuild).toUTCString() };
  if (channel.selfUrl)
    element['atom:link'] = {
      _attributes: { href: channel.selfUrl, rel: 'self', type: 'application/rss+xml' },
    };
  element.item = channel.items.map(itemToElement);

  return js2xml(
    {
      _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
      rss: {
        _attributes: { version: '2.0', 'xmlns:atom': 'http://www.w3.org/2005/Atom' },
        channel: element,
      },
    },
    { compact: true, spaces: 0 },
  );
}

/**
 * An RSS feed of the pages, newest first.
 *
 * One feed covers every language: fallback pages are left out, translations link to their own URL.
 */
export function rssPlugin<C extends AppShape = AppShape>(
  options: RSSOptions<NoInfer<C>> = {},
): Plugin<C> {
  const {
    path = '/rss.xml',
    limit = 20,
    alternateLink = true,
    getItem = async function (page) {
      const date = (await this.getPageCreatedAt(page)) ?? (await this.getPageLastModified(page));
      // only dated pages, so edits don't flood the feed with undated entries
      if (!date) return;

      return {
        title: page.data.title ?? page.path,
        description: page.data.description,
        link: this.absoluteUrl(page.url),
        pubDate: date,
      };
    },
    additionalItems = [],
  } = options;

  return {
    name: 'rss',
    head({ page }) {
      // tags without `page` are on every page
      if (!alternateLink || page) return;

      return [
        {
          tag: 'link',
          attrs: {
            rel: 'alternate',
            type: 'application/rss+xml',
            title: options.title ?? this.siteConfig.name,
            href: this.absoluteUrl(path),
          },
        },
      ];
    },
    routes() {
      const pageItem = async (page: C['page']) => {
        if (!(await this.getFallbackOrigin(page))) return getItem.call(this, page);
      };

      return [
        {
          path,
          GET: async () => {
            const source = await this.getLoader();
            const items = [
              ...(typeof additionalItems === 'function'
                ? await additionalItems.call(this)
                : additionalItems),
            ];
            for (const item of await Promise.all(source.getPages().map(pageItem))) {
              if (item) items.push(item);
            }
            items.sort((a, b) => toTime(b.pubDate) - toTime(a.pubDate));

            const title = options.title ?? this.siteConfig.name;
            const xml = buildRSS({
              title,
              link: this.absoluteUrl('/'),
              description: options.description ?? title,
              language: options.language,
              selfUrl: this.siteConfig.baseUrl ? this.absoluteUrl(path) : undefined,
              items: items.slice(0, limit),
            });
            return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml' } });
          },
        },
      ];
    },
  };
}
