---
packages:
  '@fumari/stf': patch
  '@fumadocs/json-schema': patch
---

### Support `__proto__` as a property name

- Fields named `__proto__` are stored as own properties, instead of changing the prototype of their parent object.
- Samples and merged schemas keep properties named `__proto__`, `constructor` and `prototype`.
