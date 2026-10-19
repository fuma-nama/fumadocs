---
packages:
  'fumadocs-core': patch
  'fumadocs-mdx': patch
  '@fumadocs/satteri': patch
---

### Imports across Windows drives

- `remarkImage` and generated `.source` files import files on another drive or a UNC path by their absolute path.
- Generated imports of files in dot-folders are prefixed with `./`.

Fix [#3723](https://github.com/fuma-nama/fumadocs/issues/3723)
