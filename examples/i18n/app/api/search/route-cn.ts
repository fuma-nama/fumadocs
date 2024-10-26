import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
// @ts-expect-error -- untyped
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { stopwords } from '@orama/stopwords/mandarin';

export const { GET, search } = createFromSource(source, undefined, {
  localeMap: {
    cn: {
      tokenizer: await createTokenizer({
        stopWords: stopwords,
      }),
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
  },
});
