---
packages:
  '@fumadocs/json-schema': patch
---

### Schema UI links through unions

Copied property links restore the selected `oneOf`/`anyOf` members and the schemas opened from them again, instead of staying at the root.

Fix [#3732](https://github.com/fuma-nama/fumadocs/issues/3732)
