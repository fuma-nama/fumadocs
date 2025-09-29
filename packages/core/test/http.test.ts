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
  it('appends markdown extension when preferred', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro',
        preferred: 'markdown',
        markdownExtension: '.mdx',
      }),
    ).toBe('/docs/intro.mdx');
  });

  it('skips redirect when already markdown path', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro.mdx',
        preferred: 'markdown',
        markdownExtension: '.mdx',
      }),
    ).toBeNull();
  });

  it('skips redirect when html preferred for markdown path', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro.mdx',
        preferred: 'html',
        markdownExtension: '.mdx',
      }),
    ).toBeNull();
  });

  it('respects minSegments', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs',
        preferred: 'markdown',
        markdownExtension: '.mdx',
        minSegments: 2,
      }),
    ).toBeNull();
  });

  it('returns null when format not markdown or html', () => {
    expect(
      planMarkdownRedirect({
        pathname: '/docs/intro',
        preferred: null,
      }),
    ).toBeNull();
  });

  it('resolveMarkdownRedirect integrates preference + redirect', () => {
    const target = resolveMarkdownRedirect({
      headers: headers('text/markdown'),
      pathname: '/docs/intro',
      redirectOptions: {
        markdownExtension: '.mdx',
      },
    });

    expect(target).toBe('/docs/intro.mdx');
  });
});

