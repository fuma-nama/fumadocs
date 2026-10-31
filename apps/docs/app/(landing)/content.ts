/** the page's description in search results and link previews */
export const summary =
  'Fumadocs is a React documentation framework for developers, beautifully designed by Fuma Nama.';

/** a run of a title's text, or a key term of it */
export type Run = string | { term: string };

/** a title's text, its terms as plain words and its line breaks and no-break spaces as spaces */
export function plain(title: readonly Run[]): string {
  let text = '';
  for (const run of title) text += typeof run === 'string' ? run : run.term;
  return text.replaceAll('\u00a0', ' ').replaceAll('\n', ' ');
}

/**
 * The copy of every figure, shared by the page and its Markdown version (`/index.md`). A title is
 * one sentence with its key terms marked, a line break (\n) where its lines break; a `lead` is set
 * over it as a mark of its own. A no-break space (\u00a0) holds a phrase on one line.
 */
export const copy = {
  /** the hero sets it itself, around its glitch; here for the Markdown */
  hero: {
    title: ['Build ', { term: 'better docs' }, ', in seconds.'],
    /** what she says from the moon, a bubble at a time, the first again at the end: each bubble's
     * two lines, set as they break */
    says: [
      ['Turn your Markdown into', 'a beautiful docs site!'],
      ['Fumadocs is fully open source,', 'made possible by the community :D'],
      ['I am working hard to make', 'the perfect docs framework :3'],
      ['Time to own your docs,', 'Fumadocs will keep improving!'],
    ],
  },
  parts: {
    title: ['Designed to be ', { term: 'composable' }, ',\nseparated as layers.'],
  },
  write: {
    title: [
      'Express more in fewer words,\nwith the ',
      { term: 'Markdown' },
      ' you\u00a0already\u00a0know.',
    ],
  },
  automate: {
    /** on the status plate */
    lead: 'Always up to date.',
    title: [
      'Generate content from your ',
      { term: 'code' },
      ',\nthe single ',
      { term: 'source of truth' },
      '.',
    ],
  },
  style: {
    /** a long title with no lead: what Fumadocs is, its key terms in orange */
    title: [
      'Fumadocs is a\u00a0',
      { term: 'React' },
      ' documentation framework for\u00a0',
      { term: 'developers' },
      ', beautifully designed by\u00a0',
      { term: 'Fuma Nama' },
      '.',
    ],
    /** the rest of the title, a line each */
    claims: [
      'Brings powerful features for\u00a0your\u00a0docs\u00a0workflows.',
      'High customizability to fit your preferences.',
      'Works seamlessly with any React framework, Astro, CMS, anything.',
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
    /** asked in the bubble the title answers */
    lead: 'Need more control?',
    title: [
      'Use ',
      { term: 'Fumadocs CLI' },
      ' to install\nand own the UI as ',
      { term: 'code' },
      '.',
    ],
  },
  integrations: {
    title: ['Extend your docs with ', { term: 'integrations' }, ',\neffortlessly.'],
  },
  proof: {
    title: [{ term: 'Battle-tested' }, ',\nrunning in production.'],
  },
  feedback: {
    title: ['Loved by the best\n', { term: 'developers' }, ' & ', { term: 'teams' }, '.'],
  },
  start: {
    title: ['Your docs\nare ', { term: '1 command' }, ' away.'],
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
  /** GitHub username */
  handle: string;
  role: string;
  /** GitHub avatar URL */
  avatar: string;
  message: string;
}

/** what people say, verbatim */
export const quotes: Quote[] = [
  {
    name: 'shadcn',
    handle: 'shadcn',
    role: 'Creator of Shadcn UI',
    avatar: 'https://avatars.githubusercontent.com/u/124599',
    message:
      'You know how you end up rebuilding a full docs site every time you start a new project? Fumadocs fixes this by giving you all the right blocks that you compose together. Like headless docs to build exactly what you need.',
  },
  {
    name: 'Anthony Shew',
    handle: 'anthonyshew',
    role: 'Turbo DX at Vercel',
    avatar: 'https://avatars.githubusercontent.com/u/35677084',
    message:
      'Major shoutout to @fuma_nama for making fumadocs, a gorgeous documentation framework that composes beautifully into the App Router.',
  },
  {
    name: 'Aiden Bai',
    handle: 'aidenybai',
    role: 'Creator of Million.js',
    avatar: 'https://avatars.githubusercontent.com/u/38025074',
    message: 'fumadocs is the best Next.js docs framework',
  },
  {
    name: 'David Blass',
    handle: 'ssalbdivad',
    role: 'Creator of Arktype',
    avatar: 'https://avatars.githubusercontent.com/u/10645823',
    message: "I'd have no shot building @arktypeio docs that looked half this good without it 😍",
  },
];
