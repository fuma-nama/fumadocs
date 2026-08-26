import { describe, expect, test } from 'vitest';
import { negotiateLanguages } from '@/utils/accept-language';

describe('negotiate languages', () => {
  test('missing header accepts everything', () => {
    expect(negotiateLanguages(null, ['en', 'fr', 'cn'])).toEqual(['en', 'fr', 'cn']);
  });

  test('empty header accepts nothing', () => {
    expect(negotiateLanguages('', ['en', 'fr'])).toEqual([]);
  });

  test('filters to accepted languages', () => {
    expect(negotiateLanguages('fr', ['en', 'fr', 'cn'])).toEqual(['fr']);
    expect(negotiateLanguages('de', ['en', 'fr'])).toEqual([]);
  });

  test('orders by quality', () => {
    expect(negotiateLanguages('fr;q=0.8, en', ['fr', 'en'])).toEqual(['en', 'fr']);
    expect(negotiateLanguages('en; q=0.5, fr', ['en', 'fr'])).toEqual(['fr', 'en']);
  });

  test('matches primary subtags in both directions', () => {
    expect(negotiateLanguages('en', ['en-US', 'fr'])).toEqual(['en-US']);
    expect(negotiateLanguages('en-US', ['en', 'fr'])).toEqual(['en']);
  });

  test('exact match ranks above subtag match', () => {
    expect(negotiateLanguages('en', ['en-US', 'en'])).toEqual(['en', 'en-US']);
    expect(negotiateLanguages('en-US, en;q=0.9', ['en', 'en-US'])).toEqual(['en-US', 'en']);
  });

  test('rejected languages fall out of wildcard', () => {
    expect(negotiateLanguages('en;q=0, *', ['en', 'fr'])).toEqual(['fr']);
    expect(negotiateLanguages('*', ['en', 'fr'])).toEqual(['en', 'fr']);
  });

  test('case-insensitive', () => {
    expect(negotiateLanguages('EN-us', ['en-US'])).toEqual(['en-US']);
  });
});
