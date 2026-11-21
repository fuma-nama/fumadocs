---
packages:
  'fumadocs-core': patch
---

### Unique search record ids

- The records of a page take the ids `<page id>#<n>`, so they no longer collide with another page's id, like `/blog/v3` and `/blog/v3-2`. Re-sync Algolia and Orama Cloud indexes to pick up the new ids.
- `sync()` and `syncI18n()` of Orama Cloud return their transactions, so you can commit or roll back an index synced with `autoDeploy: false`.
