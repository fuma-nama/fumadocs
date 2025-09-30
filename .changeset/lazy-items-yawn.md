---
'fumadocs-core': patch
---

**Deprecate `fumadocs-core/server` export**

It will be removed on Fumadocs 16, as some APIs under the `/server` export are actually available (and even used) under browser environment.

A more modularized design will be introduced over the original naming. 

- **`getGithubLastEdit`:** Moved to `fumadocs-core/content/github`.
- **`getTableOfContents`:** Moved to `fumadocs-core/content/toc`.
- **`PageTree` and page tree utilities:** Moved to `fumadocs-core/page-tree`.
- **`TOCItemType`, `TableOfContents`:** Moved to `fumadocs-core/toc`.
- **`createMetadataImage`:** Deprecated, use the Next.js Metadata API instead.