---
'next-docs-zeta': minor
'next-docs-ui': minor
---

Improve CommonJS/ESM compatibility

Since this release, all server utilities will be CommonJS by default unless they have referenced ESM modules in the code. For instance, `next-docs-zeta/middleware` is now a CommonJS file. However, some modules, such as `next-docs-zeta/server` requires ESM-only package, hence, they remain a ESM file.

Notice that the extension of client-side files is now `.js` instead of `.mjs`, but they're still ESM.

**Why?**

After migrating to `.mjs` Next.js config file, some imports stopped to work. The built-in Next.js bundler seems can't resolve these `next` imports in external packages, causing errors when modules have imported Next.js itself (e.g. `next/image`) in the code.

By changing client-side files extension to `.mjs` and using CommonJS for server-side files, this error is solved.