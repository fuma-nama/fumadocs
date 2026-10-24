import { showcases, vercel } from '@/lib/showcases';

export const suggest = 'https://github.com/fuma-nama/fumadocs/discussions/30';

/** projects with docs on Fumadocs: the showcase and Vercel's SDKs */
export const online = showcases.length + vercel.length;

const range = 'from UI libraries and auth frameworks to databases and AI platforms';

/**
 * The copy of the showcase, shared by the page and its Markdown version (`/showcase.md`). A title
 * reads `lead` then `title`, the lead set in the orange pixel type.
 */
export const copy = {
  header: {
    lead: 'Built with Fumadocs.',
    title: 'Docs designed with care.',
    description: `${online} projects ship their docs with it, ${range}.`,
    /** for search results, link previews and the Markdown, where "it" has nothing to refer to */
    summary: `Docs built with Fumadocs: ${online} projects, ${range}.`,
  },
  featured: { lead: 'In good company.', title: 'Projects you already know.' },
  vercel: 'Fumadocs powers the docs of its open source SDKs.',
  sites: { lead: 'The full list.', title: 'Every site, one framework.' },
  blogs: { lead: 'Beyond docs.', title: 'Fumadocs can power your blog, too.' },
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
