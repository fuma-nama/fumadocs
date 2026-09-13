import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameworkProvider } from 'fumadocs-core/framework';
import { defineI18n, type I18nConfig } from 'fumadocs-core/i18n';
import * as radix from '../src/contexts/i18n';
import * as base from '../../base-ui/src/contexts/i18n';
import * as radixHelpers from '../src/i18n';
import * as baseHelpers from '../../base-ui/src/i18n';

for (const [name, { I18nProvider, useI18n }, helpers] of [
  ['Radix UI', radix, radixHelpers],
  ['Base UI', base, baseHelpers],
] as const) {
  describe(name, () => {
    function switchLanguage(pathname: string, props: radix.I18nProviderProps, target: string) {
      const push = vi.fn();
      let onChange: ((locale: string) => void) | undefined;

      function Consumer() {
        onChange = useI18n().onChange;
        return null;
      }

      renderToStaticMarkup(
        <FrameworkProvider
          usePathname={() => pathname}
          useParams={() => ({})}
          useRouter={() => ({ push, refresh: vi.fn() })}
        >
          <I18nProvider {...props}>
            <Consumer />
          </I18nProvider>
        </FrameworkProvider>,
      );
      onChange!(target);
      return push;
    }

    test.each<[I18nConfig['hideLocale'], string, string, string, string]>([
      ['default-locale', 'zh', '/zh/docs/my-page', 'en', '/docs/my-page'],
      ['default-locale', 'en', '/docs/my-page', 'zh', '/zh/docs/my-page'],
      ['default-locale', 'zh', '/zh/docs/my-page', 'fr', '/fr/docs/my-page'],
      ['default-locale', 'en', '/en/guide', 'zh', '/zh/en/guide'],
      ['default-locale', 'en', '/docs/my-page', 'en', '/docs/my-page'],
      ['default-locale', 'zh', '/zh', 'en', '/'],
      ['default-locale', 'en', '/', 'zh', '/zh'],
      ['never', 'en', '/en/docs/my-page', 'zh', '/zh/docs/my-page'],
      ['never', 'zh', '/zh', 'en', '/en'],
      [undefined, 'en', '/en/docs/my-page', 'zh', '/zh/docs/my-page'],
      ['always', 'en', '/docs/my-page', 'zh', '/zh/docs/my-page'],
      ['always', 'en', '/en/guide', 'zh', '/zh/en/guide'],
      ['always', 'zh', '/', 'en', '/en'],
    ])('%s: %s at %s switches to %s via %s', (hideLocale, locale, path, target, expected) => {
      const push = switchLanguage(path, { locale, defaultLanguage: 'en', hideLocale }, target);
      expect(push).toHaveBeenCalledExactlyOnceWith(expected);
    });

    test('custom locale change overrides routing', () => {
      const onLocaleChange = vi.fn();
      const push = switchLanguage('/docs', { locale: 'en', onLocaleChange }, 'zh');
      expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith('zh');
      expect(push).not.toHaveBeenCalled();
    });

    test.each(['never', 'default-locale', 'always'] as const)(
      'helpers forward %s routing config and resolve the default locale',
      (hideLocale) => {
        const config = defineI18n({ defaultLanguage: 'en', languages: ['en', 'zh'], hideLocale });
        const translations = config.translations();
        for (const locale of [undefined, 'zh']) {
          const expected = { locale: locale ?? 'en', defaultLanguage: 'en', hideLocale };
          expect(helpers.i18nProvider(translations, locale)).toMatchObject(expected);
          expect(helpers.defineI18nUI(config).provider(locale)).toMatchObject(expected);
        }
      },
    );
  });
}
