---
packages:
  npm:create-fumadocs-app: minor
  npm:create-fumadocs-versions: patch
---

## Search providers and shared CLI features

`--search` accepts `algolia`, `typesense` and `mixedbread` in addition to `orama` and `orama-cloud`.

Search, linter, OG image and Ask AI options are now applied by the features of `@fumadocs/cli`, the same code that configures them on an existing app, instead of template plugins. `create-fumadocs-versions` pins the versions of the new search dependencies.
