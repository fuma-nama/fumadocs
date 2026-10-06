---
packages:
  'fumadocs-core': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
---

### Highlight search results with CSS

Search results no longer wrap matches in `<mark>`, their `content` is the indexed Markdown as is. The search dialog highlights matches of the query with the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) instead. Matches in inline code and code blocks are highlighted too, and escaped characters like `\*` stay as text.

Style the highlights with `::highlight(fd-search)`. For search UIs that render results on their own, `useHighlightQuery()` from `fumadocs-core/search` highlights the matches in an element.

- `createContentHighlighter()` is deprecated.
- Removed the `contentWithHighlights` field of search results, and the `renderHighlights` prop of `<SearchDialogListItem />`.
