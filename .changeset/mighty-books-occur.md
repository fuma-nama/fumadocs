---
"fumadocs-core": major
"fumadocs-typescript": major
---

**Introduce `fumadocs-docgen` package.**

Offer a better authoring experience for advanced use cases.

- Move `remark-dynamic-content` and `remark-install` plugins to the new package `fumadocs-docgen`.
- Support Typescript generator by default

**Usage**

Add the `remarkDocGen` plugin to your remark plugins.

```ts
import { remarkDocGen, fileGenerator } from "fumadocs-docgen";

remark().use(remarkDocGen, { generators: [fileGenerator()] })
```

Generate docs with code blocks.

````mdx
```json doc-gen:<generator>
{
    // options
}
```
````

**Migrate**

For `remarkDynamicContent`, enable `fileGenerator` and use this syntax:

````mdx
```json doc-gen:file
{
    "file": "./path/to/my-file.txt"
}
```
````

For `remarkInstall`, it remains the same:

```ts
import { remarkInstall } from "fumadocs-docgen"
```
