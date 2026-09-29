import { describe, expect, test } from 'vitest';
import { isMarkdownPreferred, rewritePath } from '@/negotiation';

function accept(value?: string) {
  return new Request('https://example.com', {
    headers: value === undefined ? {} : { Accept: value },
  });
}

describe('media-preference', () => {
  test('html', () => {
    const result = isMarkdownPreferred(
      accept('text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8'),
    );

    expect(result).toBe(false);
  });

  test('text/markdown', () => {
    const requests = [
      accept('text/markdown, text/html;q=0.9, */*;q=0.8'),
      accept('text/plain'),
      // AI agents commonly list Markdown alongside HTML without ranking either
      accept('text/html,text/markdown,text/plain,application/xhtml+xml,*/*;q=0.5'),
    ];
    for (const request of requests) {
      const result = isMarkdownPreferred(request);

      expect(result).toBe(true);
    }
  });

  test('respects quality values', () => {
    // HTML outranks Markdown, so Markdown is accepted but not preferred
    expect(isMarkdownPreferred(accept('text/html;q=0.9, text/markdown;q=0.1'))).toBe(false);
    expect(isMarkdownPreferred(accept('text/html, text/plain;q=0.1'))).toBe(false);

    expect(isMarkdownPreferred(accept('text/markdown;q=0.9, text/html;q=0.1'))).toBe(true);
    // a tie goes to Markdown, the client named it without ranking HTML above it
    expect(isMarkdownPreferred(accept('text/html;q=0.5, text/markdown;q=0.5'))).toBe(true);

    // explicitly rejected
    expect(isMarkdownPreferred(accept('text/markdown;q=0, text/html'))).toBe(false);
  });

  test('wildcards do not opt into markdown', () => {
    expect(isMarkdownPreferred(accept('*/*'))).toBe(false);
    expect(isMarkdownPreferred(accept('text/*'))).toBe(false);
    expect(isMarkdownPreferred(accept())).toBe(false);
    expect(isMarkdownPreferred(accept(''))).toBe(false);

    // an explicit Markdown type still wins over a wildcard
    expect(isMarkdownPreferred(accept('*/*;q=0.8, text/markdown'))).toBe(true);
  });

  test('custom markdown media types', () => {
    const request = accept('text/html;q=0.9, application/vnd.custom+md');

    expect(isMarkdownPreferred(request)).toBe(false);
    expect(
      isMarkdownPreferred(request, { markdownMediaTypes: ['application/vnd.custom+md'] }),
    ).toBe(true);
  });
});

test('rewrite paths', () => {
  const { rewrite } = rewritePath('/docs/*path.mdx', '/llms.txt/*path');

  expect(rewrite('/doc')).toBe(false);
  expect(rewrite('/docs')).toBe(false);
  expect(rewrite('/docs/')).toBe(false);

  expect(rewrite('/docs/index.mdx')).toMatchInlineSnapshot(`"/llms.txt/index"`);
  expect(rewrite('/docs/nested/folder/hello-world.mdx')).toMatchInlineSnapshot(
    `"/llms.txt/nested/folder/hello-world"`,
  );
});
