---
packages:
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Astro with your own routes

- Set up Astro with your own routes, layout and provider again, the managed setup moved to `@fumapress/astro`.
- On Astro, `og`, `llms`, `search`, `feedback` and `customise` write to your routes and components instead of `src/fumadocs.config.ts`.
- On Astro, `llms` serves the Markdown of pages at `<page>.md`, `/docs/index.md` for the root page.
