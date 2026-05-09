import { Provider } from '@/components/provider';
import type { Layouts } from '@/router';
import type { ConfigContext } from '@/config';
import styles from 'virtual:root.css?inline';

export function createRootLayout<C extends ConfigContext = ConfigContext>(): Layouts<C>['root'] {
  return function ({ children, lang, i18nConfig }) {
    return (
      <html lang={lang ?? 'en'} suppressHydrationWarning>
        <head>
          <style>{styles}</style>
        </head>
        <body data-version="1.0" className="flex flex-col min-h-screen">
          <Provider locale={lang} i18n={i18nConfig}>
            {children}
          </Provider>
        </body>
      </html>
    );
  };
}
