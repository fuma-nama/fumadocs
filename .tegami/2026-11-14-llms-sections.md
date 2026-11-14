---
packages:
  'fumadocs-core': minor
  '@fumadocs/cli': patch
---

### Sections of `llms()` from the page tree

- Refactored the sections of `llms()`: they are folders of the page tree, root folders by default, instead of URL directories. `llms.txt` links each section from its own line instead of a separate list.
- The `section` option chooses the folders, the path they're served as (`asPath`), and whether `llms.txt` collapses them into one link to their own `llms.txt`.
- The CLI routes the `llms.txt` of collapsed sections on every framework.
