/** the modules on the board, shared by the figure and the page's Markdown version */
export interface ModuleInfo {
  n: number;
  title: string;
  /** one line under the title */
  line: string;
  /** the package or import path that ships it */
  pkg: string;
  /** docs page; without it the cell opens the search dialog */
  href?: string;
  install: string;
}

export const modules: ModuleInfo[] = [
  {
    n: 1,
    title: 'Search',
    line: 'ZBSearch built in, or Algolia and more.',
    pkg: 'fumadocs-core/search',
    install: 'npx @fumadocs/cli feature search',
  },
  {
    n: 2,
    title: 'OpenAPI',
    line: 'API pages and a playground from your spec.',
    pkg: 'fumadocs-openapi',
    href: '/docs/integrations/openapi',
    install: 'npm i fumadocs-openapi shiki',
  },
  {
    n: 3,
    title: 'AsyncAPI',
    line: 'Docs for your event-driven APIs.',
    pkg: '@fumadocs/asyncapi',
    href: '/docs/integrations/asyncapi',
    install: 'npm i @fumadocs/asyncapi shiki',
  },
  {
    n: 4,
    title: 'GraphQL',
    line: 'Types, operations and a playground.',
    pkg: '@fumadocs/graphql',
    href: '/docs/integrations/graphql',
    install: 'npm i @fumadocs/graphql graphql',
  },
  {
    n: 5,
    title: 'Twoslash',
    line: 'Compiler types on hover in code blocks.',
    pkg: 'fumadocs-twoslash',
    href: '/docs/markdown/twoslash',
    install: 'npm i fumadocs-twoslash',
  },
  {
    n: 6,
    title: 'Type Table',
    line: 'Props tables from your TypeScript types.',
    pkg: 'fumadocs-typescript',
    href: '/docs/ui/components/auto-type-table',
    install: 'npm i fumadocs-typescript',
  },
  {
    n: 7,
    title: 'i18n',
    line: 'Localized routes, page trees and UI text.',
    pkg: 'fumadocs-core/i18n',
    href: '/docs/internationalization',
    install: 'npx @fumadocs/cli init --i18n',
  },
  {
    n: 8,
    title: 'OG Image',
    line: 'Open Graph images for every page.',
    pkg: 'fumadocs-ui/og',
    href: '/docs/integrations/og',
    install: 'npx @fumadocs/cli feature og',
  },
  {
    n: 9,
    title: 'llms.txt',
    line: 'Every page as Markdown for AI agents.',
    pkg: 'fumadocs-core/source',
    href: '/docs/integrations/llms',
    install: 'npx @fumadocs/cli feature llms',
  },
  {
    n: 10,
    title: 'AI Chat',
    line: 'Ask AI, answered from your docs.',
    pkg: '@fumadocs/ai-chat',
    href: '/docs/integrations/llms#ask-ai',
    install: 'npx @fumadocs/cli feature ai',
  },
  {
    n: 11,
    title: 'Story',
    line: 'Component previews with prop controls.',
    pkg: '@fumadocs/story',
    href: '/docs/integrations/story',
    install: 'npm i @fumadocs/story',
  },
  {
    n: 12,
    title: 'Obsidian',
    line: 'Render an Obsidian vault as docs.',
    pkg: 'fumadocs-obsidian',
    href: '/docs/integrations/content/obsidian',
    install: 'npm i fumadocs-obsidian shiki',
  },
];

/** further batteries, numbered after the board */
export const more: { name: string; href: string }[] = [
  { name: 'Changelog', href: '/docs/integrations/changelog' },
  { name: 'Blog', href: '/docs/integrations/blog' },
  { name: 'Feedback', href: '/docs/integrations/feedback' },
  { name: 'MCP Server', href: '/docs/integrations/llms#mcp-server' },
  { name: 'WebMCP', href: '/docs/integrations/llms#webmcp' },
  { name: 'EPUB Export', href: '/docs/guides/export-epub' },
  { name: 'Graph View', href: '/docs/ui/components/graph-view' },
  { name: 'Image Zoom', href: '/docs/ui/components/image-zoom' },
  { name: 'Banner', href: '/docs/ui/components/banner' },
  { name: 'GitHub Info', href: '/docs/ui/components/github-info' },
  { name: 'Math', href: '/docs/markdown/math' },
  { name: 'Static Export', href: '/docs/deploying/static' },
  { name: 'Notion', href: '/docs/integrations/content/notion' },
  { name: 'Sanity', href: '/docs/integrations/content/sanity' },
  { name: 'Python', href: '/docs/integrations/content/python' },
  { name: 'Content Collections', href: '/docs/headless/content-collections' },
  { name: 'MDX Remote', href: '/docs/integrations/content/mdx-remote' },
  { name: 'Local Markdown', href: '/docs/integrations/content/local-md' },
  { name: 'Local HTML', href: '/docs/integrations/content/local-html' },
  { name: 'OpenAPI Standalone', href: '/docs/integrations/openapi/standalone' },
  { name: 'Visual Editor', href: '/docs/editor' },
  { name: 'Preview CLI', href: '/docs/cli/preview' },
];
