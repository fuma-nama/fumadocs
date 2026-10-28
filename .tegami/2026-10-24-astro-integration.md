---
packages:
  '@fumadocs/astro': patch
  'create-fumadocs-app': patch
---

### Official Astro support

- New `@fumadocs/astro` integration, running the Markdown features of Fumadocs on the Sätteri processor of Astro. It adds the React and MDX integrations unless they are configured.
- MDX content renders as one React island with the `components` of its collection, Fumadocs UI components work in full. Without them, it renders as Astro MDX.
- The `wrapper` component receives the props of `<Content />`, for providers like i18n.
- Islands with `transition:persist` keep their state on navigation, the content of the new page moves into them.
- The `collections` option defines the content directories of Fumadocs, each can override the options of the integration. `pageLoader()` and `metaLoader()` load them by name into Astro content collections with the schemas of Fumadocs, and `toFumadocsSource()` creates the source of Fumadocs. Its pages load their content with `page.data.load()`, like other content sources.
- The Astro template uses `@fumadocs/astro`.
