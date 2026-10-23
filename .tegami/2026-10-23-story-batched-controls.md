---
packages:
  '@fumadocs/story': patch
---

### Faster story controls in dev servers

Story files requested together share one TypeScript program, and Vite environments share their results. A cold start with 300 story files takes 4s instead of 30s, without blocking the Vite dev server.

Fix [#3742](https://github.com/fuma-nama/fumadocs/issues/3742)
