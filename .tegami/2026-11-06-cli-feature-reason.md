---
packages:
  '@fumadocs/cli': patch
---

### Fumapress sites

- The CLI recognizes Fumapress sites by `press.config`. `add` and `customize` install UI as usual, and what Fumapress provides by plugins is refused.
- `fumadocs feature` says why a feature is unavailable on your project before asking you to set up what it requires.
