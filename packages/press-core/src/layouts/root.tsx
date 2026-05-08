import { Provider } from '@/components/provider';
import appCss from 'virtual:root.css?url';
import type { Layouts } from '@/router';
import type { ConfigContext } from '@/config';

export function createRootLayout<C extends ConfigContext = ConfigContext>(): Layouts<C>['root'] {
  return function ({ children, lang, i18nConfig }) {
    return (
      <html lang={lang ?? 'en'} suppressHydrationWarning>
        <head>
          <link rel="stylesheet" href={appCss} />
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
