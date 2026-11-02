import { js2xml, type ElementCompact } from 'xml-js';
import type { Context, PageAlternate } from '../context';
import type { AppShape, Awaitable, Plugin } from '../plugin';

/**
 * How frequently a page is likely to change.
 *
 * @see https://www.sitemaps.org/protocol.html#changefreqdef
 */
export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

/**
 * Last modification timestamp in W3C Datetime format (ISO 8601 subset).
 *
 * @see https://www.sitemaps.org/protocol.html#xmlDefinition
 */
export type SitemapLastMod = Date | string;

/**
 * An `xhtml:link rel="alternate"` language reference on a URL entry.
 *
 * @see https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap
 */
export type SitemapAlternateLink = Pick<PageAlternate, 'hreflang' | 'href'>;

/**
 * An `image:image` entry (Google image sitemap extension).
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */
export interface SitemapImage {
  /** URL of the image. */
  loc: string;
  caption?: string;
  geo_location?: string;
  title?: string;
  license?: string;
}

/**
 * A `video:video` entry (Google video sitemap extension).
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps
 */
export interface SitemapVideo {
  /** URL of the video thumbnail image. */
  thumbnail_loc: string;
  title: string;
  description: string;
  /** URL of the video file, at least one of `content_loc` and `player_loc` is required. */
  content_loc?: string;
  /** URL of the player page for this video. */
  player_loc?: string | { loc: string; allow_embed?: boolean };
  /** Duration in seconds (1–28800). */
  duration?: number;
  /** Date after which the video is no longer available. */
  expiration_date?: SitemapLastMod;
  /** Rating from 0.0 to 5.0. */
  rating?: number;
  view_count?: number;
  publication_date?: SitemapLastMod;
  family_friendly?: boolean;
  /** Up to 32 tags, one `video:tag` element each. */
  tag?: string | string[];
  /** Show or hide the video in search results from the given countries (ISO 3166). */
  restriction?: { relationship: 'allow' | 'deny'; countries: string[] };
  /** Show or hide the video on the given platforms. */
  platform?: { relationship: 'allow' | 'deny'; platforms: ('web' | 'mobile' | 'tv')[] };
  price?: { value: number; currency: string; type?: 'rent' | 'own' };
  requires_subscription?: boolean;
  uploader?: string | { name: string; info?: string };
  /** Whether the video is a live stream. */
  live?: boolean;
}

/**
 * A `news:news` entry (Google News sitemap extension), at most one per URL.
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */
export interface SitemapNews {
  publication: {
    /** Publication name, matching its name on news.google.com. */
    name: string;
    /** Language code (ISO 639). */
    language: string;
  };
  publication_date: SitemapLastMod;
  /** Title of the news article. */
  title: string;
}

/**
 * A `<url>` entry of a sitemap.
 *
 * @see https://www.sitemaps.org/protocol.html#xmlDefinition
 */
export interface SitemapUrl {
  /** Fully-qualified URL of the page, less than 2,048 characters. */
  loc: string;
  /** Last modification date of the page. */
  lastmod?: SitemapLastMod;
  /** Hint for how often the page changes. */
  changefreq?: SitemapChangeFrequency;
  /** Priority relative to other URLs of the site (`0.0`–`1.0`), search engines assume `0.5`. */
  priority?: number;
  /** Alternate language or regional URLs (`xhtml:link`). */
  alternates?: readonly SitemapAlternateLink[];
  /** Images of the page (Google image extension). */
  images?: readonly SitemapImage[];
  /** Videos of the page (Google video extension). */
  videos?: readonly SitemapVideo[];
  /** News article metadata (Google News extension). */
  news?: SitemapNews;
}

export interface SitemapOptions<C extends AppShape = AppShape> {
  /**
   * path of the sitemap route
   *
   * @defaultValue "/sitemap.xml"
   */
  path?: string;

  /**
   * Customize or exclude the entries of pages, return `undefined` to exclude a page.
   *
   * Pages shown in place of an untranslated page are left out.
   */
  getEntry?: (this: Context<C>, page: C['page']) => Awaitable<SitemapUrl | undefined>;

  /** entries of other pages, like the custom pages of a framework, their `loc` must be a fully-qualified URL */
  additionalEntries?: SitemapUrl[] | ((this: Context<C>) => Awaitable<SitemapUrl[]>);
}

/** the API of the sitemap plugin, from `this.getPlugin('sitemap')?.api` */
export interface SitemapAPI {
  /** the path of the sitemap, without the base path */
  path: string;
}

function formatDate(value: SitemapLastMod): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

/** xml-js escapes only the quotes of attributes, URLs can have `&` */
function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

function imageToElement(image: SitemapImage): ElementCompact {
  const element: ElementCompact = { 'image:loc': { _text: image.loc } };
  if (image.caption) element['image:caption'] = { _text: image.caption };
  if (image.geo_location) element['image:geo_location'] = { _text: image.geo_location };
  if (image.title) element['image:title'] = { _text: image.title };
  if (image.license) element['image:license'] = { _text: image.license };
  return element;
}

function videoToElement(video: SitemapVideo): ElementCompact {
  const element: ElementCompact = {
    'video:thumbnail_loc': { _text: video.thumbnail_loc },
    'video:title': { _text: video.title },
    'video:description': { _text: video.description },
  };
  const { player_loc: player, uploader } = video;

  if (video.content_loc) element['video:content_loc'] = { _text: video.content_loc };
  if (typeof player === 'string') element['video:player_loc'] = { _text: player };
  else if (player)
    element['video:player_loc'] = {
      _attributes: {
        allow_embed: player.allow_embed === undefined ? undefined : yesNo(player.allow_embed),
      },
      _text: player.loc,
    };
  if (video.duration !== undefined) element['video:duration'] = { _text: String(video.duration) };
  if (video.expiration_date)
    element['video:expiration_date'] = { _text: formatDate(video.expiration_date) };
  if (video.rating !== undefined) element['video:rating'] = { _text: String(video.rating) };
  if (video.view_count !== undefined)
    element['video:view_count'] = { _text: String(video.view_count) };
  if (video.publication_date)
    element['video:publication_date'] = { _text: formatDate(video.publication_date) };
  if (video.family_friendly !== undefined)
    element['video:family_friendly'] = { _text: yesNo(video.family_friendly) };
  if (video.restriction)
    element['video:restriction'] = {
      _attributes: { relationship: video.restriction.relationship },
      _text: video.restriction.countries.join(' '),
    };
  if (video.platform)
    element['video:platform'] = {
      _attributes: { relationship: video.platform.relationship },
      _text: video.platform.platforms.join(' '),
    };
  if (video.price)
    element['video:price'] = {
      _attributes: { currency: video.price.currency, type: video.price.type },
      _text: String(video.price.value),
    };
  if (video.requires_subscription !== undefined)
    element['video:requires_subscription'] = { _text: yesNo(video.requires_subscription) };
  if (typeof uploader === 'string') element['video:uploader'] = { _text: uploader };
  else if (uploader)
    element['video:uploader'] = {
      _attributes: { info: uploader.info ? escapeAttribute(uploader.info) : undefined },
      _text: uploader.name,
    };
  if (video.live !== undefined) element['video:live'] = { _text: yesNo(video.live) };
  if (video.tag)
    element['video:tag'] = (typeof video.tag === 'string' ? [video.tag] : video.tag).map((tag) => ({
      _text: tag,
    }));
  return element;
}

function entryToElement(entry: SitemapUrl): ElementCompact {
  const element: ElementCompact = { loc: { _text: entry.loc } };
  if (entry.lastmod) element.lastmod = { _text: formatDate(entry.lastmod) };
  if (entry.changefreq) element.changefreq = { _text: entry.changefreq };
  if (entry.priority !== undefined) element.priority = { _text: String(entry.priority) };
  if (entry.alternates?.length)
    element['xhtml:link'] = entry.alternates.map(({ hreflang, href }) => ({
      _attributes: { rel: 'alternate', hreflang, href: escapeAttribute(href) },
    }));
  if (entry.images?.length) element['image:image'] = entry.images.map(imageToElement);
  if (entry.videos?.length) element['video:video'] = entry.videos.map(videoToElement);
  if (entry.news)
    element['news:news'] = {
      'news:publication': {
        'news:name': { _text: entry.news.publication.name },
        'news:language': { _text: entry.news.publication.language },
      },
      'news:publication_date': { _text: formatDate(entry.news.publication_date) },
      'news:title': { _text: entry.news.title },
    };
  return element;
}

/** the XML of a sitemap */
export function buildSitemap(entries: SitemapUrl[]): string {
  return js2xml(
    {
      _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
      urlset: {
        _attributes: {
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
          'xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
          'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1',
          'xmlns:video': 'http://www.google.com/schemas/sitemap-video/1.1',
          'xmlns:news': 'http://www.google.com/schemas/sitemap-news/0.9',
        },
        url: entries.map(entryToElement),
      },
    },
    { compact: true, spaces: 0 },
  );
}

/** a sitemap of the content pages, with their translations and last modified dates */
export function sitemapPlugin<C extends AppShape = AppShape>(
  options: SitemapOptions<NoInfer<C>> = {},
): Plugin<C> {
  const {
    path = '/sitemap.xml',
    getEntry = async function (page) {
      const [lastmod, alternates] = await Promise.all([
        this.getPageLastModified(page),
        this.getPageAlternates(page),
      ]);
      return { loc: this.absoluteUrl(page.url), lastmod, priority: 0.8, alternates };
    },
    additionalEntries = [],
  } = options;

  return {
    name: 'sitemap',
    api: { path } satisfies SitemapAPI,
    routes() {
      const pageEntry = async (page: C['page']) => {
        if (!(await this.getFallbackOrigin(page))) return getEntry.call(this, page);
      };

      return [
        {
          path,
          GET: async () => {
            const pending: Promise<SitemapUrl | undefined>[] = [];
            for (const page of (await this.getLoader()).getPages()) pending.push(pageEntry(page));
            const entries: SitemapUrl[] = [];
            for (const entry of await Promise.all(pending)) if (entry) entries.push(entry);
            entries.push(
              ...(typeof additionalEntries === 'function'
                ? await additionalEntries.call(this)
                : additionalEntries),
            );

            return new Response(buildSitemap(entries), {
              headers: { 'Content-Type': 'application/xml' },
            });
          },
        },
      ];
    },
  };
}
