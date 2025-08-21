import { createServerFileRoute } from '@tanstack/react-start/server';
import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { createTokenizer } from '@orama/tokenizers/mandarin';

const server = createFromSource(source, {
  localeMap: {
    en: 'english',
    cn: {
      tokenizer: createTokenizer(),
    },
  },
});

export const ServerRoute = createServerFileRoute('/api/search').methods({
  GET: async ({ request }) => server.GET(request),
});
