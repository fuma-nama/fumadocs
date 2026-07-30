import { createI18nSearchAPI, createSearchAPI, type ExportedData } from '@/search/server';
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
        "breadcrumbs": undefined,
        "content": "Index",
        "id": "1",
        "type": "page",
        "url": "/",
      },
      {
        "breadcrumbs": undefined,
        "content": "<mark>Hello</mark> World",
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
  const exported = (await api.export()) as ExportedData;
  // zero-config i18n: a single multilingual database shared by all locales
  expect(exported.type).toBe('simple');
  if (exported.type !== 'i18n') expect(exported.i18n).toBe(true);
});

test('Search API I18n: zero-config languages', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['cn', 'ru'],
      defaultLanguage: 'cn',
    },
    indexes: [
      {
        title: '快速開始使用框架',
        content: '快速開始使用框架',
        url: '/cn/hello-world',
        locale: 'cn',
      },
      {
        title: 'Начало работы, ёлка',
        content: 'Начало работы, ёлка',
        url: '/ru/hello-world',
        locale: 'ru',
      },
    ],
  });

  expect(await api.search('框架', { locale: 'cn' })).toHaveLength(1);
  // diacritics folding: `елка` matches `ёлка`
  expect(await api.search('елка', { locale: 'ru' })).toHaveLength(1);
  expect(await api.search('框架', { locale: 'ru' })).toHaveLength(0);
});

test('Search API I18n: legacy locale map', async () => {
  const api = createI18nSearchAPI('simple', {
    i18n: {
      languages: ['italian', 'en'],
      defaultLanguage: 'en',
    },
    localeMap: {
      italian: 'italian',
      en: 'english',
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
  const exported = (await api.export()) as ExportedData;
  expect(exported.type).toBe('i18n');

  if (exported.type === 'i18n')
    expect(Object.keys(exported.data)).toMatchInlineSnapshot(`
    [
      "italian",
      "en",
    ]
  `);
});
