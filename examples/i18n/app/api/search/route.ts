import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
// @ts-expect-error -- untyped
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { stopwords } from '@orama/stopwords/mandarin';

export const { GET } = createFromSource(source, undefined, {
  localeMap: {
    // the prop name should be its locale code in your i18n config, (e.g. `cn`)
    cn: {
      // options for the language
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
