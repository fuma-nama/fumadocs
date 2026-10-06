---
packages:
  'fumadocs-core': patch
---

### Restore sync `index()` and `indexNode()` in `llms()`

Since 16.15.9, `index()` and `indexNode()` of `llms()` returned a promise, so code using them as strings, like joining `indexNode()` results, printed `[object Promise]` without a type error. They return a string again when `llms()` receives a loader, and only return a promise when it receives a function like `getSource` of runtime content sources. Awaiting them keeps working in both cases.
