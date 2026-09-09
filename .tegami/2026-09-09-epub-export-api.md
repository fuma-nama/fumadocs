---
packages:
  npm:fumadocs-epub: patch
---

## `createEpubExportAPI()`

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
