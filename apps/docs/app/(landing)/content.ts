/**
 * The copy of every figure, shared by the page and its Markdown version (`/index.md`). A title
 * reads `lead` then `title`, the lead set in the orange pixel type, with a line under it only for
 * what its figure can't show.
 */
export const copy = {
  hero: {
    lead: 'Meet Fumadocs.',
    title: 'Build better docs.',
    description:
      'A React documentation framework for developers, built to fit the framework and content source you already use.',
  },
  parts: {
    lead: 'Fits your stack.',
    title: 'Swap one, keep the rest.',
  },
  write: {
    lead: 'Write in Markdown.',
    title: 'Reach for React.',
    description: 'Fumadocs compiles both into one page.',
  },
  automate: {
    lead: 'Always up to date.',
    title: 'Generated from your code.',
    description: 'Change your code, and the next build updates the page.',
  },
  style: {
    /** a long title with no lead: what Fumadocs is, its key terms in the orange pixel type */
    title: [
      'Fumadocs is a ',
      { term: 'React' },
      ' documentation framework for ',
      { term: 'developers' },
      ', beautifully designed by ',
      { term: 'Fuma Nama' },
      '.',
    ],
    /** the rest of the title, a line each */
    claims: [
      'Bringing powerful features for your docs workflows,',
      'with high customizability to fit your preferences,',
      'works seamlessly with any React framework, Astro, CMS, anything.',
    ],
    /** the hands-on tabs, each with its line and its docs */
    tabs: {
      layouts: {
        label: 'Layouts',
        line: '6 layouts and 12 themes, all interchangeable.',
        href: '/docs/ui/layouts',
      },
      story: {
        label: 'Story',
        line: 'Live previews of your components, with prop controls.',
        href: '/docs/integrations/story',
      },
      openapi: {
        label: 'OpenAPI',
        line: 'API pages with a playground and code samples.',
        href: '/docs/integrations/openapi',
      },
      graphql: {
        label: 'GraphQL',
        line: 'A page per operation, with types and a playground.',
        href: '/docs/integrations/graphql',
      },
      asyncapi: {
        label: 'AsyncAPI',
        line: 'Channels and messages, with a WebSocket playground.',
        href: '/docs/integrations/asyncapi',
      },
    },
  },
  cli: {
    lead: 'Need more control?',
    title: 'Own the source code.',
    description: 'The Fumadocs CLI copies the UI into your codebase and rewires the imports.',
  },
  integrations: {
    lead: 'Feature rich.',
    title: 'Integrations that just work.',
  },
  proof: {
    lead: 'Built in the open.',
    title: 'Running in production.',
  },
  start: {
    lead: 'Your turn.',
    title: 'Start in 1 command.',
    description: 'Pick a framework and a content source. The CLI sets up the rest.',
  },
};

export const command = 'pnpm create fumadocs-app';

export const frameworks = [
  { name: 'Next.js', href: '/docs/manual-installation/next' },
  { name: 'React Router', href: '/docs/manual-installation/react-router' },
  { name: 'TanStack Start', href: '/docs/manual-installation/tanstack-start' },
  { name: 'Waku', href: '/docs/manual-installation/waku' },
  { name: 'Astro', href: '/docs/manual-installation/astro' },
];

export interface Quote {
  name: string;
  role: string;
  /** GitHub avatar URL */
  avatar: string;
  message: string;
}

/** what people say, verbatim */
export const quotes: Quote[] = [
  {
    name: 'shadcn',
    role: 'Creator of Shadcn UI',
    avatar: 'https://avatars.githubusercontent.com/u/124599',
    message:
      'You know how you end up rebuilding a full docs site every time you start a new project? Fumadocs fixes this by giving you all the right blocks that you compose together. Like headless docs to build exactly what you need.',
  },
  {
    name: 'Anthony Shew',
    role: 'Turbo DX at Vercel',
    avatar: 'https://avatars.githubusercontent.com/u/35677084',
    message:
      'Major shoutout to @fuma_nama for making fumadocs, a gorgeous documentation framework that composes beautifully into the App Router.',
  },
  {
    name: 'Aiden Bai',
    role: 'Creator of Million.js',
    avatar: 'https://avatars.githubusercontent.com/u/38025074',
    message: 'fumadocs is the best Next.js docs framework',
  },
  {
    name: 'David Blass',
    role: 'Creator of Arktype',
    avatar: 'https://avatars.githubusercontent.com/u/10645823',
    message: "I'd have no shot building @arktypeio docs that looked half this good without it 😍",
  },
];
