---
packages:
  'fumadocs-twoslash': patch
  'fumadocs-typescript': patch
  '@fumadocs/story': patch
---

### Stop TypeScript processes when idle

- Twoslash, type tables and story transforms stop their TypeScript process once they have no pending work, instead of keeping it until the build ends.
