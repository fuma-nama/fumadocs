---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Fix crash in `DynamicCodeBlock` when `options` is undefined

`DynamicCodeBlock` read `options.components` unconditionally while building its Shiki config, even though `options` is optional on the public wrapper component. Passing an explicit `options={undefined}` (e.g. a value forwarded from another optional prop) crashed with `Cannot read properties of undefined (reading 'components')` instead of falling back to the default `pre` renderer.

`options` is now read with optional chaining, so an undefined `options` behaves the same as omitting the prop entirely.
