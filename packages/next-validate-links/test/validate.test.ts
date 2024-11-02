import { expect, test } from 'vitest';
import { scanURLs } from '@/scan';
import { validateFiles } from '@/validate';

const scanned = await scanURLs({
  pages: [
    'page.tsx',
    'docs/page.tsx',
    'docs/[...slug]/page.tsx',
    'dynamic/[[...slug]]/page.tsx',
  ],
  populate: {
    'docs/[...slug]': [
      {
        value: ['hello'],
      },
      {
        value: ['hello', 'world'],
        hashes: ['hash'],
      },
    ],
  },
});

test('validate links: valid', async () => {
  expect(
    await validateFiles(
      [
        {
          path: 'a.md',
          content: '[hello](/)',
        },
        {
          path: 'b.md',
          content:
            '[hello](/docs) [hello](/docs/hello) [hello](/docs/hello/world#hash)',
        },
        {
          path: 'c.md',
          content: '[hello](/dynamic) [hello](/dynamic/anything)',
        },
      ],
      { scanned },
    ),
  ).lengthOf(0, 'no error');
});

test('validate links: valid with frontmatter', async () => {
  expect(
    await validateFiles(
      [
        {
          path: 'a.md',
          content: `---
title: hello world [hello](/sfd)
---

[hello](/)`,
        },
      ],
      { scanned },
    ),
  ).lengthOf(0, 'no error');
});

test('validate links: not found', async () => {
  expect(
    await validateFiles(
      [
        {
          path: 'a.md',
          content: `[hello](/docs/invalid)
[hello](/doc)`,
        },
      ],
      { scanned },
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "detected": [
          [
            "/docs/invalid",
            1,
            1,
            "not-found",
          ],
          [
            "/doc",
            2,
            1,
            "not-found",
          ],
        ],
        "file": "a.md",
      },
    ]
  `);
});

test('validate links: invalid fragments', async () => {
  expect(
    await validateFiles(
      [
        {
          path: 'a.md',
          content: `[hello](/docs/hello/world#invalid)`,
        },
      ],
      { scanned },
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "detected": [
          [
            "/docs/hello/world#invalid",
            1,
            1,
            "invalid-fragment",
          ],
        ],
        "file": "a.md",
      },
    ]
  `);
});
