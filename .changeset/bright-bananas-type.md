---
'@fuma-docs/ui': major
---

**Improve internationalized routing**

`I18nProvider` now handles routing for you.
Therefore, `locale` and `onChange` is no longer required.

```tsx
<I18nProvider
  translations={{
    cn: {
      name: 'Chinese', // required
      search: 'Translated Content',
    },
  }}
></I18nProvider>
```


`LanguageSelect` detects available options from your translations, therefore, the `languages` prop is removed.