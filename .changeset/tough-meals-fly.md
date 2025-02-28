---
'fumadocs-docgen': major
---

**Remove `typescriptGenerator` from `fumadocs-docgen`**

**why:** Move dedicated parts to `fumadocs-typescript`, so all docs generation features for TypeScript can be put together in a single module.

**migrate:** Use `fumadocs-typescript`  We made a new `remarkAutoTypeTable` remark plugin generating the type table but with a different syntax:

```mdx
<auto-type-table path="./my-file.ts" name="MyInterface" />
```

Instead of:

````mdx
```json doc-gen:typescript
{
  "file": "./my-file.ts",
  "name": "MyInterface"
}
```
````
