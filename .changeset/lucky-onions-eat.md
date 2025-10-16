---
'fumadocs-core': major
---

**Switch to Shiki JavaScript Regex engine by default**

This is important for Cloudflare Worker compatibility, JavaScript engine is the new default over Oniguruma (WASM).

- `rehype-code`: replaced the `experimentalJSEngine` option with `engine: js | oniguruma`.
- `fumadocs-core/highlight`: use JS engine by default, drop custom engine support, use Shiki directly instead.
 