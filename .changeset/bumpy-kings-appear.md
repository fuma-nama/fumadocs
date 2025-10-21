---
'fumadocs-mdx': major
---

**Vite: move `source.generated.ts` to `.source/index.ts`**

**Why:** 
- with Fumadocs MDX Plugins, we want to unify the output directory across Vite & Next.js.
- `source.generated.ts` looks ugly compared by `.source`.

**Migrate:** 

- run dev server/typegen to generate a `.source` folder.
- import it over the original `source.generated.ts`.
- note that both docs and `create-fumadocs-app` are updated to `.source` folder.
