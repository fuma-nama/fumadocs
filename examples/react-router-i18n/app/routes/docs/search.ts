import type { Route } from './+types/search';
import { createI18nSearchAPI } from 'fumadocs-core/search/server';
import { source } from '~/source';
import { structure } from 'fumadocs-core/mdx-plugins';
import { i18n } from '~/i18n';
import { createTokenizer } from '@orama/tokenizers/mandarin';

const server = createI18nSearchAPI('advanced', {
  i18n,
  localeMap: {
    cn: {
      tokenizer: createTokenizer(),
    },
  },
  indexes: source.getLanguages().flatMap((entry) => {
    return entry.pages.map((page) => ({
      id: page.url,
      url: page.url,
      title: page.data.title ?? '',
      description: page.data.description,
      structuredData: structure(page.data.content),
      locale: entry.language,
    }));
  }),
});

export async function loader({ request }: Route.LoaderArgs) {
  return server.GET(request);
}
