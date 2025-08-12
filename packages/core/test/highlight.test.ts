import { expect, test } from 'vitest';
import { createContentHighlighter } from '@/search/shared';

test('highlight search results', () => {
  const highlighter = createContentHighlighter('hello world helloworld');

  expect(highlighter.highlight('oops hello, world hello! worldhello'))
    .toMatchInlineSnapshot(`
      [
        {
          "content": "oops ",
          "type": "text",
        },
        {
          "content": "hello",
          "styles": {
            "highlight": true,
          },
          "type": "text",
        },
        {
          "content": ", ",
          "type": "text",
        },
        {
          "content": "world",
          "styles": {
            "highlight": true,
          },
          "type": "text",
        },
        {
          "content": " ",
          "type": "text",
        },
        {
          "content": "hello",
          "styles": {
            "highlight": true,
          },
          "type": "text",
        },
        {
          "content": "! ",
          "type": "text",
        },
        {
          "content": "world",
          "styles": {
            "highlight": true,
          },
          "type": "text",
        },
        {
          "content": "hello",
          "styles": {
            "highlight": true,
          },
          "type": "text",
        },
      ]
    `);
  expect(highlighter.highlight('helloworld!!!')).toMatchInlineSnapshot(`
    [
      {
        "content": "hello",
        "styles": {
          "highlight": true,
        },
        "type": "text",
      },
      {
        "content": "world",
        "styles": {
          "highlight": true,
        },
        "type": "text",
      },
      {
        "content": "!!!",
        "type": "text",
      },
    ]
  `);
  expect(highlighter.highlight('wor ld hello')).toMatchInlineSnapshot(`
    [
      {
        "content": "wor ld ",
        "type": "text",
      },
      {
        "content": "hello",
        "styles": {
          "highlight": true,
        },
        "type": "text",
      },
    ]
  `);
});
