---
packages:
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Managed setup of Astro

- Set up Astro with the managed setup of `@fumadocs/astro`, without routes, layouts or providers in your app.
- On Astro, `og`, `llms`, `search`, `feedback` and `customise` extend `src/fumadocs.config.ts` and the `layout` and `page` modules.
