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
