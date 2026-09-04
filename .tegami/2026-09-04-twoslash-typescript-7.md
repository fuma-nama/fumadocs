---
packages:
  npm:fumadocs-twoslash: major
---

## Run Twoslash on TypeScript 7

`fumadocs-twoslash` now runs on the native TypeScript 7 compiler (`typescript/unstable/sync`) instead of bundling its own TypeScript 6, so the types in popups come from the same compiler as your project.

Code blocks of documents compiled concurrently are analyzed together in one snapshot of the TypeScript project (requires `fumadocs-core` 16.8 for the `_fd_prepare` hook of `rehype-code`), which removes most of the per-block cost of loading the project. Cold builds of the Fumadocs docs take 40% less time in total, with the TypeScript part 3.5x faster.

The Shiki transformer and renderer are now implemented in `fumadocs-twoslash`, `@shikijs/twoslash` and `twoslash` are no longer dependencies (nor `twoslash` a peer of TypeScript 6). The rendered HTML is unchanged. The `@include` meta of Shiki Twoslash is not supported, and `rendererRich` options are removed.

The `twoslashOptions` are simplified to what the native API supports:

- `compilerOptions` takes `tsconfig.json` values (e.g. `moduleResolution: 'bundler'`) instead of enum values from the `typescript` package.
- `cwd` replaces `vfsRoot`.
- `tsModule`, `tsLibDirectory`, `fsMap`, `cache`, `extraFiles`, `customTransformers` and the `@showEmit` notation are removed.

```ts
transformerTwoslash({
  twoslashOptions: {
    compilerOptions: {
      types: ['node'],
    },
  },
});
```
