---
packages:
  npm:@fumadocs/satteri: patch
---

## Fix tab names that consist of a single JSX element

With `parseMdx` enabled, `remarkCodeTab` unwrapped a tab name that was entirely one JSX element and kept only its children, so icon-only names like `tab="<Home />"` rendered an empty trigger. Only paragraphs are unwrapped now, matching the behavior of `fumadocs-core`.
