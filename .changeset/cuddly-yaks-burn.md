---
'fumadocs-core': major
---

**Migrate to rehype-shikiji**

- Dropped support for inline code syntax highlighting
- Use notation-based word/line highlighting instead of meta string

Before:

````md
```ts /config/ {1}
const config = "Hello"

something.call(config)
```
````

After:

````md
```ts
// [!code word:config]
const config = "Hello" // [!code highlight]

something.call(config)
```
````

Read the docs of Shikiji for more information.