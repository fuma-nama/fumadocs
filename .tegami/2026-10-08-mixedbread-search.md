---
packages:
  'fumadocs-core': minor
  '@fumadocs/cli': patch
---

### Sync Mixedbread stores with `sync()`

- `sync()` and `toDocuments()` from `fumadocs-core/search/mixedbread` upload a file for each page, whose chunks are its title, headings and paragraphs. Results link to their headings and render tables like other search integrations.
- Stores synced with `mxbai store sync` need a re-sync, the frontmatter of pages is no longer read.
- Tag filters match the tags of pages, `locale` filters results by language, and the `limit` of requests can only lower `topK`.
- The Mixedbread template of Fumadocs CLI syncs a pre-rendered `static.json` with `sync()`, debounces searches by 300 ms, and reads the API key from `MXBAI_API_KEY`.
