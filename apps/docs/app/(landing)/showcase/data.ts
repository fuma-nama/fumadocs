import type { ShowcaseObject } from '@/lib/showcases';

export const suggest = 'https://github.com/fuma-nama/fumadocs/discussions/30';

/** the showcase's copy, shared with `/showcase.md`: a title reads `lead`, in pixel type, then `title` */
export const copy = {
  header: {
    lead: 'Showcase.',
    title: 'Loved by teams and developers.',
    /** for search results, link previews and the Markdown */
    summary:
      'Docs built with Fumadocs, from UI libraries and auth frameworks to databases and AI platforms.',
  },
  vercel: 'Fumadocs powers the docs of its open source SDKs.',
  blogs: { lead: 'Beyond docs.', title: 'Fumadocs can power your blogs.' },
};

/** the featured projects by URL, and what they are in their own words */
export const kinds: Record<string, string> = {
  'https://ui.shadcn.com': 'components',
  'https://better-auth.com': 'auth framework',
  'https://prisma.io': 'ORM and Postgres',
  'https://zod.dev': 'schema validation',
  'https://arktype.io': 'validator',
  'https://turbo.build': 'build system',
  'https://flags-sdk.dev': 'feature flags',
  'https://chat-sdk.dev': 'chat bots',
};

/** the wall's order: the featured with a screenshot, every other site with one, then the rest */
export function arrange(sites: ShowcaseObject[]) {
  const featured: Required<ShowcaseObject>[] = [];
  const shots: Required<ShowcaseObject>[] = [];
  const blank: ShowcaseObject[] = [];
  for (const site of sites) {
    if (!site.image) blank.push(site);
    else if (kinds[site.url]) featured.push({ ...site, image: site.image });
    else shots.push({ ...site, image: site.image });
  }
  return { featured, shots, blank };
}
