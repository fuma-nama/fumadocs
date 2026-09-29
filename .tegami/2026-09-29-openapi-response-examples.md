---
packages:
  'fumadocs-openapi': patch
---

### Skip response examples without a value

An Example Object can omit `value`, like when it uses `externalValue`, which crashed the operation page. These examples are skipped.

Examples with the OpenAPI 3.2 `dataValue` are rendered too.

Fix [#3608](https://github.com/fuma-nama/fumadocs/issues/3608)
