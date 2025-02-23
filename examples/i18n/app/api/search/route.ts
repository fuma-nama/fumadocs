import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
// @ts-expect-error -- untyped
import { createTokenizer } from '@orama/tokenizers/mandarin';

export const { GET } = createFromSource(source, undefined, {
  localeMap: {
    // you can customise search configs for specific locales, like:
    // [locale]: settings

    // specify the tokenizer
    cn: {
      tokenizer: await createTokenizer(),
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },

    // use the English tokenizer
    cs: 'english',
  },
});
