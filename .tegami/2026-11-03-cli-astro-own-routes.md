---
packages:
  '@fumadocs/cli': minor
  'create-fumadocs-app': patch
---

### Astro with your own routes

- Refactored: set up Astro with your own routes, layout and provider again, the managed setup moved to `@fumapress/astro`.
- On Astro, `og`, `llms`, `search`, `feedback` and `customise` write to your routes and components instead of `src/fumadocs.config.ts`.
- On Astro, `llms` serves the Markdown of pages at `<page>.md`, `/docs/index.md` for the root page.
- On Astro, routes that need a server (`mcp`, `epub`, server search) render on request with `output: 'static'` too.
- On Astro, generated and template routes build pages whose file names need URI encoding, like spaces.
- `ai` refuses Astro projects again.
- Removed the managed setup helpers: `ensureAstroOption` of `@fumadocs/cli/codemod`, `requiresManaged`, `requiresManagedMarkdown`, `addAstroPlugin`, `astroModule`, `astroModuleFile` and `addDocsLlms` of the features.
