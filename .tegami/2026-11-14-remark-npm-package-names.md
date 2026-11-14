---
packages:
  'fumadocs-core': patch
---

### Install packages named like npm commands

- `package-install` code blocks install packages whose names start with `npm` or `npx`, like `npm-run-all`, instead of rendering them as commands that pnpm, Yarn and Bun can't convert.
