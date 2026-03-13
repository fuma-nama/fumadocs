import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';
import { createTokenizer } from '@orama/tokenizers/mandarin';

export const { GET } = createFromSource(source, {
  localeMap: {
    cn: {
      tokenizer: createTokenizer(),
    },
  },
});
