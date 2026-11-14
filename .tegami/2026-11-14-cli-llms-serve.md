---
packages:
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Files for agents in every framework

- `fumadocs feature llms` serves the files of `docsLlms.serve()` on every framework: `llms.txt`, `llms-full.txt`, the `llms-full.txt` of each section and `<page>.md`.
- Page Markdown moves from `/llms.mdx/docs/<page>/content.md` to `<page>.md`, and to `/llms.mdx/<page>.md` on React Router.
- React Router and Waku serve the Markdown of a docs page to requests that prefer `text/markdown`.
- The CLI no longer generates `getPageMarkdownUrl()`: the Markdown URL of a page is `${page.url}.md`.
- The Astro template serves the files from one endpoint.
