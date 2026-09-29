import { expect, test } from 'vitest';
import { llms, loader, type StaticSource } from '@/source';
import { defineI18n } from '@/i18n';

const source: StaticSource = {
  files: [
    { type: 'page', path: 'index.mdx', data: { title: 'Index', description: 'hello' } },
    { type: 'page', path: 'nested/page.mdx', data: { title: 'Page', description: 'world' } },
  ],
};

const docs = loader({ baseUrl: '/docs', source });
const renderPage = (page: (typeof docs)['$inferPage']) =>
  `# ${page.data.title}\n\n${page.data.description}`;

test('llms: index', async () => {
  await expect(llms(docs).index()).resolves.toMatchInlineSnapshot(`
    "# Docs

    - [Index](/docs): hello
    - Nested
      - [Page](/docs/nested/page): world"
  `);
});

test('llms: page & full', async () => {
  const output = llms(docs, { renderPage });

  await expect(output.page(docs.getPage([])!)).resolves.toBe('# Index\n\nhello');
  await expect(output.full()).resolves.toBe('# Index\n\nhello\n\n# Page\n\nworld');
});

test('llms: page requires renderPage at runtime', async () => {
  // the type-level guard is bypassed by untyped callers
  const output = llms(docs) as ReturnType<typeof llms<never>> & {
    full: () => Promise<string>;
  };

  await expect(output.full()).rejects.toThrowError('renderPage');
});

test('llms: runtime content sources', async () => {
  const output = llms(async () => docs, { renderPage });

  await expect(output.index()).resolves.toContain('[Index](/docs)');
  await expect(output.full()).resolves.toBe('# Index\n\nhello\n\n# Page\n\nworld');
});

test('loader: get page by url', () => {
  expect(docs.getPageByUrl('/docs/nested/page')?.data.title).toBe('Page');
  expect(docs.getPageByUrl('/docs/missing')).toBeUndefined();

  const i18n = defineI18n({ defaultLanguage: 'en', languages: ['en', 'cn'] });
  const localized = loader({
    baseUrl: '/docs',
    i18n,
    source: {
      files: [
        { type: 'page', path: 'index.mdx', data: { title: 'Index' } },
        { type: 'page', path: 'index.cn.mdx', data: { title: '索引' } },
      ],
    },
  });

  // without a language, every language is looked up
  expect(localized.getPageByUrl('/cn/docs')?.data.title).toBe('索引');
  expect(localized.getPageByUrl('/en/docs')?.data.title).toBe('Index');
});
