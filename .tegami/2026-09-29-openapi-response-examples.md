---
packages:
  'fumadocs-openapi': patch
---

### Skip response examples without a value

An Example Object can omit `value`, like when it uses `externalValue`, which crashed the operation page. These examples are skipped, and the response falls back to `example` or a sample of its schema when none is left.

Fix [#3608](https://github.com/fuma-nama/fumadocs/issues/3608)
