import { createI18nSearchAPI, createSearchAPI } from '@/search/server';
import { expect, test } from 'vitest';
import { structure } from '@/mdx-plugins';

test('Search API', () => {
  const api = createSearchAPI('simple', {
    indexes: [
      {
        title: 'Hello World',
        content: 'Hello World',
        url: '/hello-world',
      },
      {
        title: 'Nothing',
        content: 'Nothing',
        url: '/nothing',
      },
    ],
  });

  expect(api.search('Hello')).toHaveLength(1);
  expect(api.search('pterodactyl')).toHaveLength(0);
});

test('Search API Advanced', () => {
  const api = createSearchAPI('advanced', {
    tag: true,
    indexes: [
      {
        id: '1',
        title: 'Index',
        structuredData: structure(
          `## Hello World

something`,
        ),
        url: '/',
        tag: 'my-tag',
      },
      {
        id: '2',
        title: 'Page',
        structuredData: structure(
          `## My Page

something`,
        ),
        url: '/page',
        tag: '',
      },
    ],
  });

  expect(api.search('Page')).toHaveLength(2);
  expect(api.search('something')).toHaveLength(4);
  expect(api.search('', { tag: 'my-tag' })).toHaveLength(3);

  expect(api.search('Hello')).toMatchInlineSnapshot(`
    [
      {
        "content": "Index",
        "id": "1",
        "type": "page",
        "url": "/",
      },
      {
        "content": "Hello World",
        "id": "10",
        "type": "heading",
        "url": "/#hello-world",
      },
    ]
  `);
});

test('Search API I18n', () => {
  const api = createI18nSearchAPI('simple', {
    indexes: [
      [
        'cn',
        [
          {
            title: 'Hello World Chinese',
            content: 'Hello World',
            url: '/hello-world',
          },
        ],
      ],
      [
        'en',
        [
          {
            title: 'Hello World English',
            content: 'Hello World',
            url: '/hello-world',
          },
        ],
      ],
    ],
  });

  expect(api.search('English', { locale: 'en' })).toHaveLength(1);
  expect(api.search('Hello World Chinese', { locale: 'cn' })).toHaveLength(1);
});
