---
packages:
  '@fumadocs/json-schema': patch
---

### Recursive schemas in `mergeAllOf()`

- Recursive schemas no longer overflow, e.g. subtypes that extend a parent listing them in `oneOf` merge to the parent's keywords and their own.
- Nested schemas defined by multiple members, like a property, are combined with `allOf` and merged when read.
- Keywords of a composed schema win over its members, including `readOnly` and `writeOnly`.

Fix [#3724](https://github.com/fuma-nama/fumadocs/issues/3724)
