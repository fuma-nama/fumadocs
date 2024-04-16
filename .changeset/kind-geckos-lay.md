---
"fumadocs-core": major
---

Simplify Source API virtual storage.

why: Improve performance

migrate:

```diff
- storage.write('path.mdx', { type: 'page', ... })
- storage.readPage('page')
+ storage.write('path.mdx', 'page', { ... })
+ storage.read('page', 'page')
```