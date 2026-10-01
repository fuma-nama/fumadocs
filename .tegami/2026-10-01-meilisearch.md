---
packages:
  'fumadocs-core': patch
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Meilisearch integration

Search your docs with [Meilisearch](https://www.meilisearch.com), self-hosted or on Meilisearch Cloud.

- `toDocuments()` and `sync()` from `fumadocs-core/search/meilisearch` export your pages and replace the documents of an index, old documents stay searchable until the new ones are indexed.
- `meilisearchClient()` from `fumadocs-core/search/client/meilisearch` searches from the browser with `useDocsSearch()`, filtered by tag and locale.

```tsx
const client = new Meilisearch({ host, apiKey: searchKey });

useDocsSearch({
  client: meilisearchClient({ client, indexName: 'docs', locale }),
});
```

Set it up with `npx @fumadocs/cli feature search --provider meilisearch`, or choose it in `create-fumadocs-app`.

Fix [#3627](https://github.com/fuma-nama/fumadocs/issues/3627)
