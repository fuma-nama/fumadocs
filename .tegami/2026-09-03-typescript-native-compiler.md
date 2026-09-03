---
packages:
  npm:fumadocs-typescript: minor
---

## Generate type tables with the native TypeScript compiler

`fumadocs-typescript` no longer uses ts-morph. It drives the TypeScript 7 native compiler (`tsgo`) through the `typescript/unstable/sync` API, bundled as a dependency, so it works regardless of the TypeScript version of your project, including TypeScript 7 before its programmatic API is stable.

Only the documented files (and what they import) are loaded into the compiler, instead of the entire `tsconfig.json` project. On the Fumadocs docs site this makes cold generation about 5x faster (first table 500 ms → 50 ms, later tables 20 ms → 5 ms) with roughly half the memory.

**Behavior changes**

- `transform` and `typeSimplifier` hooks receive TypeScript 7 API objects (`Type`, `Symbol`, `Checker`, `Node`) instead of ts-morph wrappers. `this.program` is the TypeScript 7 `Project`, and `this.checker` is available.
- The `project` option of `createGenerator()` takes the `Project` returned by `createProject()`.
- Members of mapped types (e.g. `Pick`) and unions may be printed in a different order, following the native compiler.
