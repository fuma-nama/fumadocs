---
'fumadocs-ui': major
'fumadocs-core': major
---

**Remove deprecated APIs**

- `fumadocs-ui/page`:
  - removed `<DocsCategory />`.
  - removed `breadcrumbs.full` option from `<DocsPage />`.
- `fumadocs-core/search/algolia`: renamed option `document` to `indexName`.
- `fumadocs-core/search`:
  - remove deprecated signature of `createFromSource()`: migrate to newer usage instead.
     ```ts
     export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
             source: S,
             pageToIndexFn?: (page: InferPageType<S>) => Awaitable<AdvancedIndex>,
             options?: Omit<Options<S>, 'buildIndex'>,
     ): SearchAPI;
     ```
  - remove deprecated parameters in `useSearch()`, pass them in the client object instead.
- `fumadocs-core/highlight`: remove deprecated `withPrerenderScript` and `loading` options from `useShiki()`.
- `fumadocs-core/i18n`: removed `createI18nMiddleware`, import from `fumadocs-core/i18n/middleware` instead.
- `fumadocs-core/source`: 
  - removed deprecated `transformers`, `pageTree.attach*` options from `loader()`.
  - removed deprecated `page.file` property.
  - removed `FileInfo` & `parseFilePath` utilities.