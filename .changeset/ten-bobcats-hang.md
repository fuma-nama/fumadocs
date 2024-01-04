---
'next-docs-zeta': major
---

**Improve `createI18nMiddleware` function**

Now, you can export the middleware directly without a wrapper.

From:

```ts
export default function middleware(request: NextRequest) {
  return createI18nMiddleware(...);
}
```

To:

```ts
export default createI18nMiddleware({
  defaultLanguage,
  languages,
})
```