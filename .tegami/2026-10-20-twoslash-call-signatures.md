---
packages:
  'fumadocs-twoslash': patch
---

### Hover signatures of repeated calls

Hovering a call shows that call's own resolved signature again. Repeated calls of the same function, such as two `z.enum([...])` calls with different values, all showed the first call's signature, since the hover cache did not tell call sites apart.

Fix [#3727](https://github.com/fuma-nama/fumadocs/issues/3727)
