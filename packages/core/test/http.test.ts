import { describe, expect, it } from 'vitest';
import {
  pickPreferredFormat,
  parseAcceptHeader,
  resolveMarkdownRedirect,
} from '@/http';

function headers(accept: string | null): Headers {
  const h = new Headers();
  if (accept !== null) h.set('accept', accept);
  return h;
}

describe('media-preference', () => {
  it('returns null when header missing', () => {
    expect(pickPreferredFormat(headers(null))).toBeNull();
  });

  it('prefers markdown types when ranked higher', () => {
    expect(
      pickPreferredFormat(
        headers('text/markdown;q=1.0, text/html;q=0.9'),
      ),
    ).toBe('markdown');
  });

  it('prefers html when q-value higher', () => {
    expect(
      pickPreferredFormat(headers('text/markdown;q=0.5, text/html;q=0.9')),
    ).toBe('html');
  });

  it('uses order when q-values equal', () => {
    expect(
      pickPreferredFormat(headers('text/html, text/markdown')),
    ).toBe('html');
    expect(
      pickPreferredFormat(headers('text/markdown, text/html')),
    ).toBe('markdown');
  });

  it('supports custom media types', () => {
    expect(
      pickPreferredFormat(headers('application/x-custom'), {
        markdownTypes: ['application/x-custom'],
        htmlTypes: [],
      }),
    ).toBe('markdown');
  });

  it('parseAcceptHeader exposes q and order', () => {
    const entries = parseAcceptHeader(headers('text/html;q=0.8, text/plain'));
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ value: 'text/html', q: 0.8, order: 0 });
    expect(entries[1]).toMatchObject({ value: 'text/plain', q: 1, order: 1 });
  });
});

describe('markdown redirect', () => {
  it('returns rewrite target when markdown preferred', () => {
    const target = resolveMarkdownRedirect({
      headers: headers('text/markdown'),
      pathname: '/docs/intro',
      redirectOptions: {
        target: '/llms.mdx',
        sourceBase: '/docs',
      },
    });

    expect(target).toBe('/llms.mdx/intro');
  });

  it('respects minSegments', () => {
    const result = resolveMarkdownRedirect({
      headers: headers('text/markdown'),
      pathname: '/docs/a',
      redirectOptions: {
        target: '/llms.mdx',
        sourceBase: '/docs',
        minSegments: 2,
      },
    });

    expect(result).toBeNull();
  });

  it('returns null when format not markdown', () => {
    const target = resolveMarkdownRedirect({
      headers: headers('text/html'),
      pathname: '/docs/intro',
      redirectOptions: {
        target: '/llms.mdx',
      },
    });

    expect(target).toBeNull();
  });
});

