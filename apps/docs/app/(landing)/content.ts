/** the beats of the parts figure under its lead, the first is its title */
const beats = [
  {
    title: 'Every part has an API.',
    description:
      'The navbar, sidebar, code blocks and the rest are components and functions you can import, restyle or replace.',
  },
  {
    title: '3 layers deep.',
    description:
      'Content feeds the core and the core feeds the UI, on the framework you choose. Each layer is a library on its own.',
  },
  {
    title: 'Swap one, keep the rest.',
    description:
      'Bring your own content source, framework or UI. Each one plugs into the same core.',
  },
];

/**
 * The copy of every figure, shared by the page and its Markdown version (`/index.md`). A title
 * reads `lead` then `title`, the lead set in the orange pixel type.
 */
export const copy = {
  hero: {
    lead: 'Fumadocs.',
    title: 'Flexible to the core.',
    description:
      'A documentation framework for React. It comes with a beautiful UI, MDX and integrations, and you can swap any part for your own.',
  },
  parts: {
    lead: 'Inside a page.',
    ...beats[0],
    beats,
  },
  write: {
    lead: 'Write in Markdown.',
    title: 'Reach for React.',
    description:
      'With MDX, writers stay in plain Markdown while developers add React components and type-checked code. Fumadocs compiles both into one page.',
  },
  style: {
    lead: 'Beautiful by default.',
    title: 'Yours by design.',
    description:
      'Pick from 6 layouts and 12 themes, all built from the same parts. Restyle them with CSS variables, or copy a layout into your project.',
  },
  cli: {
    lead: 'Full control.',
    title: 'Install the UI into your codebase.',
    description:
      'The Fumadocs CLI copies layouts and components into your project and points your imports at them. Edit them like your own code.',
  },
  integrations: {
    lead: 'Integrations.',
    title: 'Add only what you need.',
    description:
      'Search, API references, AI chat, i18n and more ship in first-party packages. Each one starts with a single command.',
  },
  proof: {
    lead: 'Built in the open.',
    title: 'Running in production.',
    description:
      'Projects like shadcn/ui, Better Auth, Prisma and Zod ship their docs on Fumadocs.',
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
