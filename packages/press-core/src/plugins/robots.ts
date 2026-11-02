import type { AppShape, Plugin } from '../plugin';
import type { SitemapAPI } from './sitemap';

/**
 * A group of rules in `robots.txt`.
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt
 */
export interface RobotsRule {
  /**
   * crawler(s) the rule applies to
   *
   * @defaultValue "*"
   */
  userAgent?: string | string[];

  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
}

export interface RobotsOptions {
  /**
   * path of the robots.txt route
   *
   * @defaultValue "/robots.txt"
   */
  path?: string;

  /**
   * @defaultValue [{ userAgent: "*", allow: "/" }]
   */
  rules?: RobotsRule[];

  /**
   * Reference the sitemap:
   *
   * - `string`: URL (or path relative to `site.baseUrl`) of the sitemap.
   * - `true`: the sitemap of the sitemap plugin, `/sitemap.xml` without the plugin.
   * - `false`: don't reference a sitemap.
   *
   * By default, references the sitemap of the sitemap plugin when it is added.
   */
  sitemap?: string | boolean;

  /** raw content appended to the output */
  additionalContent?: string;
}

function lines(name: string, values: string | string[] | undefined): string[] {
  if (values === undefined) return [];
  const out: string[] = [];
  for (const value of typeof values === 'string' ? [values] : values) out.push(`${name}: ${value}`);
  return out;
}

function ruleToText(rule: RobotsRule): string {
  const out = [
    ...lines('User-agent', rule.userAgent ?? '*'),
    ...lines('Allow', rule.allow),
    ...lines('Disallow', rule.disallow),
  ];
  if (rule.crawlDelay !== undefined) out.push(`Crawl-delay: ${rule.crawlDelay}`);
  return out.join('\n');
}

export function robotsPlugin<C extends AppShape = AppShape>(
  options: RobotsOptions = {},
): Plugin<C> {
  const {
    path = '/robots.txt',
    rules = [{ userAgent: '*', allow: '/' }],
    sitemap,
    additionalContent,
  } = options;

  return {
    name: 'robots',
    routes() {
      return [
        {
          path,
          GET: () => {
            const sections = rules.map(ruleToText);
            const api = this.getPlugin('sitemap')?.api as SitemapAPI | undefined;
            const sitemapPath =
              typeof sitemap === 'string'
                ? sitemap
                : sitemap !== false && (api?.path ?? (sitemap ? '/sitemap.xml' : undefined));
            if (sitemapPath) sections.push(`Sitemap: ${this.absoluteUrl(sitemapPath)}`);
            if (additionalContent) sections.push(additionalContent);

            return new Response(sections.join('\n\n'), {
              headers: { 'Content-Type': 'text/plain' },
            });
          },
        },
      ];
    },
  };
}
