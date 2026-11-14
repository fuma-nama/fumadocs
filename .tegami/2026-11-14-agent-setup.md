---
packages:
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
  'fumadocs-core': patch
  'fumadocs-mdx': patch
---

### Setup for AI agents

- CLI prompts don't wait without a terminal: a missing choice fails with the flag and its values, confirmations take their default, and existing files are kept unless `--yes` is passed.
- The CLI fails with a clear message where it finds no supported framework, instead of setting up Next.js.
- The CLI detects Radix UI from a plain `fumadocs-ui` dependency.
- `init --i18n` on a static Next.js site keeps the locale in URLs and writes no proxy.
- The duplicated slugs error names both files.
- The macro error of Fumadocs MDX explains how to load content outside the bundler.
- New projects include an `AGENTS.md` that links the Fumadocs docs for AI agents.
