---
'fumadocs-core': minor
'fumadocs-ui': minor
---

**Support type-safe i18n config**

```ts
// lib/source.ts
import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'cn'],
});
```

```tsx
// root layout
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

const { provider } = defineI18nUI(i18n, {
  translations: {
    cn: {
      displayName: 'Chinese',
      search: 'Translated Content'
    },
    en: {
      displayName: 'English'
    }
  }
});

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider i18n={provider(lang)}>{children}</RootProvider>
  );
}
```

Although optional, we highly recommend you to refactor the import to i18n middleware:

```ts
// here!
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

export default createI18nMiddleware(i18n);
};
```