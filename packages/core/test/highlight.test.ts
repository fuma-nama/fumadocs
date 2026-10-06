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

test('highlight inline code', () => {
  const highlighter = createContentHighlighter('register');

  expect(highlighter.highlightMarkdown('call `register` and register')).toBe(
    'call <code><mark>register</mark></code> and <mark>register</mark>',
  );
  expect(highlighter.highlightMarkdown('`a < register`')).toBe(
    '<code>a &lt; <mark>register</mark></code>',
  );
  expect(highlighter.highlightMarkdown('`other` register')).toBe('`other` <mark>register</mark>');
});
