---
packages:
  npm:fumadocs-core:
    type: patch
---

## Return heading and text results from the Algolia client

`algoliaClient` grouped hits into page, heading and text results, then dropped everything except pages. All three are now returned with highlighting, matching the other search clients.
