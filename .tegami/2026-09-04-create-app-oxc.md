---
packages:
  npm:create-fumadocs-app: patch
---

## Replace ts-morph with oxc-parser

Template transforms (routes, prerender config, `RootProvider` search dialog, AI chat layout) now parse files with `oxc-parser` and edit the source text in place, instead of `ts-morph` and the TypeScript 6 compiler it bundles. Edits preserve the original formatting, including trailing commas.
