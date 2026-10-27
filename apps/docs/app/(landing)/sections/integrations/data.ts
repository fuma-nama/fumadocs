/** the modules on the board, shared by the figure and the page's Markdown version */
export interface Module {
  title: string;
  /** one line under the title */
  line: string;
  /** the package or import path that ships it */
  pkg: string;
  /** docs page; without it the cell opens the search dialog */
  href?: string;
  install: string;
}

export const modules: Module[] = [
  {
    title: 'Search',
    line: 'ZBSearch built in, or Algolia and more.',
    pkg: 'fumadocs-core/search',
    install: 'npx @fumadocs/cli feature search',
  },
  {
    title: 'OpenAPI',
    line: 'API pages and a playground from your spec.',
    pkg: 'fumadocs-openapi',
    href: '/docs/integrations/openapi',
    install: 'npm i fumadocs-openapi shiki',
  },
  {
    title: 'AsyncAPI',
    line: 'Docs for your event-driven APIs.',
    pkg: '@fumadocs/asyncapi',
    href: '/docs/integrations/asyncapi',
    install: 'npm i @fumadocs/asyncapi shiki',
  },
  {
    title: 'GraphQL',
    line: 'Types, operations and a playground.',
    pkg: '@fumadocs/graphql',
    href: '/docs/integrations/graphql',
    install: 'npm i @fumadocs/graphql graphql',
  },
  {
    title: 'AI Chat',
    line: 'Ask AI, answered from your docs.',
    pkg: '@fumadocs/ai-chat',
    href: '/docs/integrations/llms#ask-ai',
    install: 'npx @fumadocs/cli feature ai',
  },
  {
    title: 'llms.txt',
    line: 'Every page as Markdown for AI agents.',
    pkg: 'fumadocs-core/source',
    href: '/docs/integrations/llms',
    install: 'npx @fumadocs/cli feature llms',
  },
  {
    title: 'i18n',
    line: 'Localized routes, page trees and UI text.',
    pkg: 'fumadocs-core/i18n',
    href: '/docs/internationalization',
    install: 'npx @fumadocs/cli init --i18n',
  },
  {
    title: 'OG Image',
    line: 'Open Graph images for every page.',
    pkg: 'fumadocs-ui/og',
    href: '/docs/integrations/og',
    install: 'npx @fumadocs/cli feature og',
  },
  {
    title: 'Twoslash',
    line: 'Compiler types on hover in code blocks.',
    pkg: 'fumadocs-twoslash',
    href: '/docs/markdown/twoslash',
    install: 'npm i fumadocs-twoslash',
  },
  {
    title: 'Type Table',
    line: 'Props tables from your TypeScript types.',
    pkg: 'fumadocs-typescript',
    href: '/docs/ui/components/auto-type-table',
    install: 'npm i fumadocs-typescript',
  },
  {
    title: 'Story',
    line: 'Component previews with prop controls.',
    pkg: '@fumadocs/story',
    href: '/docs/integrations/story',
    install: 'npm i @fumadocs/story',
  },
  {
    title: 'Obsidian',
    line: 'Render an Obsidian vault as docs.',
    pkg: 'fumadocs-obsidian',
    href: '/docs/integrations/content/obsidian',
    install: 'npm i fumadocs-obsidian shiki',
  },
];

/** further integrations, in the row under the board */
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
