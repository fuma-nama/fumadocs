---
packages:
  '@fumadocs/astro': patch
  'create-fumadocs-app': patch
---

### Official Astro support

- New `@fumadocs/astro` integration, running the Markdown features of Fumadocs on the Sätteri processor of Astro.
- MDX content renders as one React island, Fumadocs UI components work in full.
- The `wrapper` component receives the props of `<Content />`, for providers like i18n.
- Islands with `transition:persist` keep their state on navigation, the content of the new page moves into them.
- Content collection loaders and `toFumadocsSource()` for the source of Fumadocs.
- The Astro template uses `@fumadocs/astro`.
