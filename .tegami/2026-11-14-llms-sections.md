---
packages:
  'fumadocs-core': patch
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Sections of `llms()` from the page tree

- Sections of `llms()` are page tree folders instead of URL directories, and root folders are sections by default.
- In `llms.txt`, the line of a section's folder links to the `llms-full.txt` of the section.
- The `section` option chooses the sections, and can collapse a section into one link to its own `llms.txt`.
- The CLI serves the `llms.txt` of collapsed sections on every framework.
- The `AGENTS.md` of new projects links the docs for customizing layouts, themes and MDX components.
