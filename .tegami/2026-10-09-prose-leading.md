---
packages:
  '@fumadocs/tailwind': patch
---

### Tune prose line height with `leading-*`

`prose` reads its line height from `--tw-leading`, so `leading-*` utilities change it regardless of class order, like they do with `text-*` utilities.

The first and last children of blockquotes have no outer margins, so a blockquote at the start or end of `prose` no longer leaves a gap.
