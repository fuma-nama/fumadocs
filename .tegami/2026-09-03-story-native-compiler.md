---
packages:
  npm:@fumadocs/story: minor
---

## Generate controls with the native TypeScript compiler

`@fumadocs/story` no longer depends on ts-morph. Story controls are generated with the TypeScript 7 native compiler (`tsgo`), bundled as a dependency, independent of the TypeScript version of your project.

Transforming a story file is about 5x faster (first file 300 ms → 30 ms, edits 20 ms → 5 ms) and uses a fraction of the memory, which mostly matters in dev where every edit regenerates controls.

**Behavior changes**

- Custom handlers of `@fumadocs/story/type-tree` receive TypeScript 7 API objects (`Type`, `Node`, and a `Project` exposing `project.checker`) instead of ts-morph wrappers.
- Properties of mapped types (e.g. `Pick<Props, ...>`) and members of string literal unions may appear in a different order in the generated controls, following the native compiler.
