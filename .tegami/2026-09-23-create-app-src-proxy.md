---
packages:
  npm:create-fumadocs-app: patch
---

## Move `proxy.ts` into `src` when the `/src` directory is enabled

The Next.js template ships a `proxy.ts` that rewrites `<page>.md` and `Accept: text/markdown` requests to the Markdown route.
With the `/src` option, the CLI moved `app`, `lib` and `components` into `src` but left `proxy.ts` at the project root, where Next.js silently ignores it.

The CLI now moves `proxy.ts` (and the other root convention files Next.js reads next to `app`) into `src`, so the Markdown rewrite runs in generated projects.
