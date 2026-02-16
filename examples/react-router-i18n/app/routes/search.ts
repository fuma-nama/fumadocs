import type { Route } from './+types/search';
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';
import { createTokenizer } from '@orama/tokenizers/mandarin';

const server = createFromSource(source, {
  localeMap: {
    en: 'english',
    cn: {
      tokenizer: createTokenizer(),
    },
  },
});

export async function loader({ request }: Route.LoaderArgs) {
  return server.GET(request);
}
