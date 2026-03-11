import { expect, test } from 'vitest';
import { createContentHighlighter } from '@/search';

test('highlight search results', () => {
  const highlighter = createContentHighlighter('hello world helloworld');

  expect(
    highlighter.highlightMarkdown('oops hello, world hello! worldhello'),
  ).toMatchInlineSnapshot(
    `"oops <mark>hello</mark>, <mark>world</mark> <mark>hello</mark>! <mark>world</mark><mark>hello</mark>"`,
  );
  expect(highlighter.highlightMarkdown('helloworld!!!')).toMatchInlineSnapshot(
    `"<mark>hello</mark><mark>world</mark>!!!"`,
  );
  expect(highlighter.highlightMarkdown('wor ld hello')).toMatchInlineSnapshot(
    `"wor ld <mark>hello</mark>"`,
  );
});
