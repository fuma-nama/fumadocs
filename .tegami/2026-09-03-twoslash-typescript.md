---
packages:
  npm:fumadocs-twoslash: patch
---

## Bundle TypeScript for Twoslash

`fumadocs-twoslash` now depends on its own TypeScript 6 and passes it to Twoslash, so the transformer keeps working in projects on TypeScript 7 (whose package no longer provides the compiler API Twoslash requires). Previously, every Twoslash code block that was not already in the types cache failed with `Cannot read properties of undefined (reading 'readFile')`.
