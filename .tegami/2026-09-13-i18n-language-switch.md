---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Fix language switching with hidden locale prefixes

Root Provider's `i18n` option now accepts `defaultLanguage` and `hideLocale`. The language switcher uses these options instead of guessing from the current URL, so switching from `/zh/docs` to the default language `en` with `hideLocale: 'default-locale'` navigates to `/docs`.

`i18nProvider()` and `defineI18nUI()` pass these options from your i18n config automatically.
