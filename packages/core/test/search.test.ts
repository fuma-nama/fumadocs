import { createI18nSearchAPI, createSearchAPI } from '@/search/server';
import { expect, test } from 'vitest';
import { structure } from '@/mdx-plugins';

test('Search API', async () => {
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

  expect(await api.search('Hello')).toHaveLength(1);
  expect(await api.search('pterodactyl')).toHaveLength(0);
});

test('Search API Advanced', async () => {
  const api = createSearchAPI('advanced', {
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
        tag: 'test',
      },
    ],
  });

  expect(await api.search('Page')).toHaveLength(2);
  expect(await api.search('something')).toHaveLength(4);
  expect(await api.search('', { tag: 'my-tag' })).toHaveLength(3);

  expect(await api.search('Hello')).toMatchInlineSnapshot(`
    [
      {
        "content": "Index",
        "id": "1",
        "type": "page",
        "url": "/",
      },
      {
        "content": "Hello World",
        "id": "1-0",
        "type": "heading",
        "url": "/#hello-world",
      },
    ]
  `);
});

test('Search API I18n', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['italian', 'en'],
      defaultLanguage: 'en',
    },
    indexes: [
      {
        title: 'ciao mondo amico italian',
        content: 'ciao mondo amico',
        url: '/hello-world',
        locale: 'italian',
      },
      {
        title: 'Hello World English',
        content: 'Hello World',
        url: '/hello-world',
        locale: 'en',
      },
    ],
  });

  expect(await api.search('English', { locale: 'en' })).toHaveLength(1);
  expect(await api.search('amico', { locale: 'italian' })).toHaveLength(1);
  expect(await api.search('italian', { locale: 'en' })).toHaveLength(0);
  const exported = await api.export();
  expect(exported.type).toBe('i18n');

  if (exported.type === 'i18n')
    expect(Object.keys(exported.data)).toMatchInlineSnapshot(`
    [
      "italian",
      "en",
    ]
  `);
});
