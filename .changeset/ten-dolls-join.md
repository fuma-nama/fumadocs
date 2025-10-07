---
'fumadocs-ui': major
'fumadocs-core': major
---

**Remove deprecated APIs**

- `fumadocs-ui/page`: `<DocsCategory />` removed.
  - `<DocsPage />`: removed `breadcrumbs.full`.
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