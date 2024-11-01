import { expect, test } from 'vitest';
import { scanURLs } from '@/scan';

test('scan pages', async () => {
  const scanned = await scanURLs({
    pages: ['page.tsx', 'docs/page.tsx', 'nested/docs/page.tsx'],
  });

  expect(scanned).toMatchInlineSnapshot(`
    {
      "fallbackUrls": [],
      "urls": Map {
        "/" => {},
        "/docs" => {},
        "/nested/docs" => {},
      },
    }
  `);
});

test('scan pages with meta', async () => {
  const scanned = await scanURLs({
    pages: ['page.tsx', 'docs/page.tsx', 'nested/docs/page.tsx'],
    meta: {
      'page.tsx': {
        hashes: ['test'],
      },
    },
  });

  expect(scanned).toMatchInlineSnapshot(`
    {
      "fallbackUrls": [],
      "urls": Map {
        "/" => {
          "hashes": [
            "test",
          ],
        },
        "/docs" => {},
        "/nested/docs" => {},
      },
    }
  `);
});

test('scan pages with params', async () => {
  const scanned = await scanURLs({
    pages: [
      'page.tsx',
      'docs/page.tsx',
      'docs/[...slug]/page.tsx',
      'nested/blog/[slug]/page.tsx',
      'nested/docs/[[...slug]]/page.tsx',
    ],
    populate: {
      'docs/[...slug]': [
        {
          value: ['hello'],
        },
        {
          value: ['hello', 'world'],
          hashes: ['hash'],
          queries: [
            {
              query: 'value',
            },
          ],
        },
      ],
      'nested/docs/[[...slug]]': [
        {
          value: ['hello'],
        },
        {
          value: [],
        },
      ],
      'nested/blog/[slug]': [
        {
          value: 'hello',
        },
      ],
    },
    meta: {
      'page.tsx': {
        hashes: ['test'],
      },
    },
  });

  expect(scanned).toMatchInlineSnapshot(`
    {
      "fallbackUrls": [],
      "urls": Map {
        "/" => {
          "hashes": [
            "test",
          ],
        },
        "/docs" => {},
        "/docs/hello" => {
          "value": [
            "hello",
          ],
        },
        "/docs/hello/world" => {
          "hashes": [
            "hash",
          ],
          "queries": [
            {
              "query": "value",
            },
          ],
          "value": [
            "hello",
            "world",
          ],
        },
        "/nested/blog/hello" => {
          "value": "hello",
        },
        "/nested/docs/hello" => {
          "value": [
            "hello",
          ],
        },
        "/nested/docs" => {
          "value": [],
        },
      },
    }
  `);
});

test('scan pages with dynamic params', async () => {
  const scanned = await scanURLs({
    pages: [
      'page.tsx',
      'docs/page.tsx',
      'docs/[...slug]/page.tsx',
      'blog/[[...slug]]/page.tsx',
    ],
  });

  expect(scanned).toMatchInlineSnapshot(`
    {
      "fallbackUrls": [
        {
          "meta": {},
          "url": /\\^\\\\/docs\\\\/\\(\\.\\+\\)\\$/,
        },
        {
          "meta": {},
          "url": /\\^\\\\/blog\\\\/\\(\\.\\+\\)\\$/,
        },
      ],
      "urls": Map {
        "/" => {},
        "/docs" => {},
        "/blog" => {
          "value": [],
        },
      },
    }
  `);
});
