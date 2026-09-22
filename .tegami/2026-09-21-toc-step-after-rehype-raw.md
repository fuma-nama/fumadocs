---
packages:
  npm:fumadocs-core: patch
---

## Keep TOC step numbers after an HTML re-parse

`remarkSteps` marks each step heading with a numeric `data-fd-step`, and the TOC plugin only read it as a number.
A later `rehype-raw` pass re-parses the tree from HTML, so the property came back as the canonical `dataFdStep` string and every step number silently vanished from the table of contents.

`rehypeToc` now accepts both shapes, so pipelines that render raw HTML in Markdown keep their numbered TOC.
