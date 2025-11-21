---
'fumadocs-core': minor
---

**[Loader API] Refactor internal type parameters**

Internal types like `ContentStorage`, `PageTreeTransformer` now use a single `Config extends SourceConfig` generic parameter.

It makes extending their parameters easier, this should not affect normal usages.
