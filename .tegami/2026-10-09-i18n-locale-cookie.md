---
packages:
  'fumadocs-core': patch
---

### Ignore unsupported locale cookies

With `hideLocale: 'always'`, `createI18nMiddleware()` ignores locale cookies that aren't in `languages`.
