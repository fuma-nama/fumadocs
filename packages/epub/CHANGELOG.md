## fumadocs-epub@1.2.3

### Fix Markdown output and search records

- `remarkImage()` with `onError: 'hide'` removes the right images when a paragraph has several, and Sätteri removes them from the Markdown too.
- `files` code blocks of `remarkMdxFiles()` nest the entries under the last item of a folder (after `└──`), and trees indented with spaces only.
- The remark and rehype plugins no longer slow down quadratically on large documents, like `rehypeToc()` taking 17 ms instead of 239 ms on a 5 MB page.
- `fumadocs-epub` removes every unresolved image, the second of two adjacent ones was kept.
- Sätteri: headings with expression props, like `<Badge value={1} />` or local images, compile again, without these elements in their `toc` entry.
- Sätteri: `remarkStructure()` records every node type listed in `types`, like `fumadocs-core`. A blockquote is one search record instead of two. In the Markdown, includes and type tables stay inside their list item or blockquote, heading IDs no longer break setext and closed ATX headings, and nested replacements no longer duplicate the source after them.

## fumadocs-epub@1.2.2

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## fumadocs-epub@1.2.1

### `createEpubExportAPI()`

A route handler for the EPUB export, replacing the auth check and response headers you had to write yourself:

```ts
// app/export/epub/route.ts
import { createEpubExportAPI } from 'fumadocs-epub';
import { source } from '@/lib/source';

export const { GET } = createEpubExportAPI({
  source,
  title: 'Documentation',
  author: 'Your Team',
  secret: process.env.EXPORT_SECRET,
});
```

`secret` is required: requests must send `Authorization: Bearer <secret>`, and the route answers `503` while the secret itself is unset, so a missing environment variable cannot leave the export open. It also takes `filename` (default `docs.epub`) and every option of `exportEpub()`, which stays available for public routes and scripts.

## fumadocs-epub@1.2.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

# fumadocs-epub

## 1.1.0

### Minor Changes

- cf0ec91: Update min Fumadocs version

### Patch Changes

- Updated dependencies [68c2b49]

## 1.0.2

### Patch Changes

- 2d8f596: fix `npm pack` skipping nested `node_modules`
- Updated dependencies [2d8f596]
  - fumadocs-core@16.7.14

## 1.0.1

### Patch Changes

- 690ddb9: bundle more deps
- Updated dependencies [690ddb9]
  - fumadocs-core@16.7.13
