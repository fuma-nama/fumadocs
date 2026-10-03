---
packages:
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
  '@fumadocs/cli': patch
---

### Place AI chat in layouts

Docs, Notebook, and Glass layouts accept an `aiChat` option, pass your chat as `aiChat.panel` and the layout places it beside the page on wide viewports, and floats it over the page on smaller ones.

Your chat component no longer needs layout-specific positioning, like targeting `#nd-docs-layout` or overriding `--fd-right-width`.

The `ai` feature of Fumadocs CLI now renders your docs layout from a client component at `components/ai/layout.tsx`, which passes the installed chat to `aiChat`. It supports Docs, Notebook, Glass, and Spacious layouts, and only adds a floating trigger to the layouts without their own.
