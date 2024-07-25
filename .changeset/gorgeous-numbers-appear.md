---
'fumadocs-ui': major
---

**Change usage of I18nProvider**

**why:** Make possible to load translations lazily

**migrate:**

```tsx
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import { I18nProvider } from 'fumadocs-ui/i18n';

export default function Layout({
  params: { lang },
  children,
}: {
  params: { lang: string };
  children: ReactNode;
}) {
  return (
    <html lang={lang}>
      <body>
        <I18nProvider
          locale={lang}
          // options
          locales={[
            {
              name: 'English',
              locale: 'en',
            },
            {
              name: 'Chinese',
              locale: 'cn',
            },
          ]}
          // translations
          translations={
            {
              cn: {
                toc: '目錄',
                search: '搜尋文檔',
                lastUpdate: '最後更新於',
                searchNoResult: '沒有結果',
                previousPage: '上一頁',
                nextPage: '下一頁',
              },
            }[lang]
          }
        >
          <RootProvider>{children}</RootProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```
