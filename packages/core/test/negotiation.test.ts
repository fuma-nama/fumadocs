import { describe, expect, test } from 'vitest';
import { isMarkdownPreferred, rewritePath } from '@/negotiation';

describe('media-preference', () => {
  test('html', () => {
    const result = isMarkdownPreferred(
      new Request('https://example.com', {
        headers: {
          Accept:
            'text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8',
        },
      }),
    );

    expect(result).toBe(false);
  });

  test('text/markdown', () => {
    const requests = [
      new Request('https://example.com', {
        headers: {
          Accept: 'text/markdown, text/html;q=0.9, */*;q=0.8',
        },
      }),
      new Request('https://example.com', {
        headers: {
          Accept: 'text/plain',
        },
      }),
    ];
    for (const request of requests) {
      const result = isMarkdownPreferred(request);

      expect(result).toBe(true);
    }
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
