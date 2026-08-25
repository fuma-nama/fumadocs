---
packages:
  npm:@fumadocs/api-docs: patch
---

## Preserve `description` when merging `allOf` schemas

`mergeAllOf()` no longer drops descriptions defined inside `allOf` members, so this common composition pattern renders its description in the Schema UI:

```yaml
amount:
  allOf:
    - $ref: '#/components/schemas/Money'
    - description: Property-specific description
```

The last defined description among members wins, and a description on the outer schema keeps precedence over all of them.
