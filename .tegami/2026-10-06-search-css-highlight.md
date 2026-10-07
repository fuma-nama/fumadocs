---
packages:
  'fumadocs-core': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
---

### Highlight search results with CSS

Search results no longer wrap matches in `<mark>`, `content` is the indexed Markdown. The search dialog highlights matches with the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API), style them with `::highlight(fd-search)`. Custom search UIs can use `useHighlightQuery()` from `fumadocs-core/search/client`.

- `createContentHighlighter()` is deprecated.
- Removed `contentWithHighlights` from search results, and the `renderHighlights` prop of `<SearchDialogListItem />`.
