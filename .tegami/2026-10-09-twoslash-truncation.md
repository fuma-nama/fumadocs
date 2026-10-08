---
packages:
  'fumadocs-twoslash': patch
---

### Truncate long types in hovers, faster analysis

- Types longer than 500 characters in hover popups are truncated by the checker (`... 26 more ...`) instead of printed in full, so pages with large object types compile to much smaller MDX.
- Code blocks are briefly written to the `.twoslash` directory while being analyzed, instead of going through filesystem callbacks, which makes the analysis about 2x faster. Add `.twoslash` to your `.gitignore`.
- Identical popups of a code block are highlighted once.

Fix [#3672](https://github.com/fuma-nama/fumadocs/issues/3672)
