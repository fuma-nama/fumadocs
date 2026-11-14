---
packages:
  '@fumadocs/cli': patch
  'fumadocs-core': patch
  'fumadocs-mdx': patch
---

### Setup without a terminal

- CLI prompts don't wait without a terminal: a missing choice fails with the flag and its values, confirmations take their default, and existing files are kept unless `--yes` is passed.
- The CLI fails with a clear message where it finds no supported framework, instead of setting up Next.js.
- The CLI detects Radix UI from a plain `fumadocs-ui` dependency.
- `init --i18n` on a static Next.js site keeps the locale in URLs and writes no proxy.
- The duplicated slugs error names both files.
- The macro error of Fumadocs MDX explains how to load content outside the bundler.
