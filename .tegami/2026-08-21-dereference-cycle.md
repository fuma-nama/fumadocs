---
packages:
  npm:@fumadocs/api-docs:
    type: patch
---

## Survive `$ref` cycles in `dereferenceShallow`

A Reference Object whose target eventually refers back to it overflowed the stack. The schema is now marked while its target resolves, so a cycle resolves to the sibling keywords instead of recursing forever.
