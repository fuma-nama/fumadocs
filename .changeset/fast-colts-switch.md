---
'fumadocs-openapi': major
---

Drop support for function in `input`, instead, pass an object/record of `[k: string]: () => Awaitable<string | Schema>`
