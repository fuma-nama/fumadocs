---
packages:
  '@fumadocs/local-content': patch
  '@fumadocs/local-html': patch
  'fumadocs-obsidian': patch
---

### Watch the dependencies of local content

- Integrations call `file.addDependency(path)` for the files a parsed file depends on, like included files. A change to them invalidates the file, and the Vite & dev server watchers watch them, even outside the content directory.
- `invalidateFile()` returns whether the source uses the file, `onDependency()` listens to the dependencies.
- `watchWithVite()` called after the Vite server started now watches content directories outside of Vite's root.
