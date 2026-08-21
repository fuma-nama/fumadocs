---
packages:
  npm:fumadocs-mdx:
    type: patch
---

## Encode `import.meta.glob` query values

The Vite codegen passed the query to `import.meta.glob` as an object, letting the bundler serialize it. Rolldown inlines the values as-is, so a macro id such as `src/lib/source.ts#docs` left an unescaped `/` in the content file's module id and relative imports from that module (e.g. images from `![Banner](/logo.png)`) failed to resolve, since the importer's directory is derived from the raw id.

The query is now serialized (and percent-encoded) by Fumadocs itself, matching what the Node.js codegen already did.
