import { describe, expect, it } from 'vitest';
import {
  pickPreferredFormat,
  parseAcceptHeader,
  planMarkdownRedirect,
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
  it('builds rewrite target when preferred', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro',
        preferred: 'markdown',
        target: '/llms.mdx',
        sourceBase: '/docs',
      }),
    ).toBe('/llms.mdx/intro');
  });

  it('skips redirect when slug missing', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs',
        preferred: 'markdown',
        target: '/llms.mdx',
        sourceBase: '/docs',
      }),
    ).toBeNull();
  });

  it('skips redirect when html preferred for markdown path', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro.mdx',
        preferred: 'html',
        target: '/llms.mdx',
      }),
    ).toBeNull();
  });

  it('respects minSegments', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/a/b',
        preferred: 'markdown',
        target: '/llms.mdx',
        sourceBase: '/docs',
        minSegments: 2,
      }),
    ).toBe('/llms.mdx/a/b');

    expect(
      planMarkdownRedirect({
        pathname: '/docs/a',
        preferred: 'markdown',
        target: '/llms.mdx',
        sourceBase: '/docs',
        minSegments: 2,
      }),
    ).toBeNull();
  });

  it('returns null when format not markdown or html', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro',
        preferred: null,
        target: '/llms.mdx',
      }),
    ).toBeNull();
  });

  it('resolveMarkdownRedirect integrates preference + redirect', () => {
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
});

