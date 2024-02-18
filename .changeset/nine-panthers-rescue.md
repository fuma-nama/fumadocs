---
'fumadocs-ui': major
---

**Remove deprecated usage of `Files` component**

Why: Since `8.3.0`, you should use the `Folder` component instead for folders. For simplicity, the `title` prop has been renamed to `name`.

Migrate: Replace folders with the `Folder` component. Rename `title` prop to `name`.

```diff
- <Files>
- <File title="folder">
- <File title="file.txt" />
- </File>
- </Files>

+ <Files>
+ <Folder name="folder">
+ <File name="file.txt" />
+ </Folder>
+ </Files>
```