import type { Layouts } from '@/router';
import type { ConfigContext } from '@/config';
import styles from 'virtual:root.css?inline';
import { RootProvider, type RootProviderProps } from 'fumadocs-ui/provider/waku';

export function createRootLayout<C extends ConfigContext = ConfigContext>(): Layouts<C>['root'] {
  return async function ({ children, lang, i18nConfig, data }) {
    const hooks = data['core:provider'];
    let providerProps: RootProviderProps = {};

    if (i18nConfig) {
      providerProps.i18n = {
        locale: lang,
        locales: Object.entries(i18nConfig.languages).map(([k, v]) => ({
          name: v.displayName,
          locale: k,
        })),
        translations: lang ? i18nConfig.languages[lang]?.translations : undefined,
      };
    }

    if (hooks) {
      for (const hook of hooks) {
        providerProps = await hook(providerProps);
      }
    }

    return (
      <html lang={lang ?? 'en'} suppressHydrationWarning>
        <head>
          <style>{styles}</style>
        </head>
        <body data-version="1.0" className="flex flex-col min-h-screen">
          <RootProvider {...providerProps}>{children}</RootProvider>
        </body>
      </html>
    );
  };
}
