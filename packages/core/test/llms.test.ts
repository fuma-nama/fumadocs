import { expect, expectTypeOf, test } from 'vitest';
import { llms, loader, type LLMsWithPages, type StaticSource } from '@/source';
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

test('llms: index', () => {
  const output = llms(docs);

  expect(output.index()).toMatchInlineSnapshot(`
    "# Docs

    - [Index](/docs): hello
    - Nested
      - [Page](/docs/nested/page): world"
  `);
  expect(output.indexNode(docs.pageTree.children[0])).toBe('- [Index](/docs): hello');
});

test('llms: renderUrl', () => {
  const output = llms(docs, { renderUrl: (item) => `/sub${item.url}` });

  expect(output.index()).toContain('- [Index](/sub/docs): hello');
  expect(output.index()).toContain('  - [Page](/sub/docs/nested/page): world');
});

test('llms: page & full', async () => {
  const output = llms(docs, { renderPage });

  await expect(output.page(docs.getPage([])!)).resolves.toBe('# Index\n\nhello');
  await expect(output.full()).resolves.toBe('# Index\n\nhello\n\n# Page\n\nworld');
});

test('llms: page requires renderPage at runtime', async () => {
  // the type-level guard is bypassed by untyped callers
  const output = llms(docs) as LLMsWithPages<never>;

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

const guideDocs = loader({
  baseUrl: '/docs',
  source: {
    files: [
      { type: 'page', path: 'index.mdx', data: { title: 'Index' } },
      { type: 'page', path: 'guide/index.mdx', data: { title: 'Guide', description: 'learn' } },
      { type: 'page', path: 'guide/setup.mdx', data: { title: 'Setup' } },
      { type: 'page', path: 'guide/deep/page.mdx', data: { title: 'Deep' } },
      { type: 'page', path: 'misc/note.mdx', data: { title: 'Note' } },
      // a root folder doesn't take its index page
      { type: 'meta', path: 'api/meta.json', data: { root: true } },
      { type: 'page', path: 'api/index.mdx', data: { title: 'API' } },
      { type: 'page', path: 'api/get.mdx', data: { title: 'Get' } },
    ],
  },
});
const renderTitle = (page: (typeof guideDocs)['$inferPage']) => `# ${page.data.title}`;

test('llms: files', async () => {
  const output = llms(guideDocs, { renderPage: renderTitle });

  // `misc` and `guide/deep` have a single page
  await expect(output.files()).resolves.toEqual([
    '/llms.txt',
    '/llms-full.txt',
    '/docs.md',
    '/docs/guide.md',
    '/docs/guide/setup.md',
    '/docs/guide/deep/page.md',
    '/docs/misc/note.md',
    '/docs/api.md',
    '/docs/api/get.md',
    '/docs/llms-full.txt',
    '/docs/guide/llms-full.txt',
    '/docs/api/llms-full.txt',
  ]);
});

test('llms: serve', async () => {
  const output = llms(guideDocs, { renderPage: renderTitle });
  const text = async (path: string) => (await output.serve(path))!.text();

  expect(await text('/llms.txt')).toContain('[Setup](/docs/guide/setup.md)');
  expect(await text('/llms.txt')).toContain(
    '## Sections\n\n- [/docs](/docs/llms-full.txt)\n- [/docs/guide](/docs/guide/llms-full.txt)',
  );
  expect(await text('/docs/guide/llms-full.txt')).toBe('# Guide\n\n# Setup\n\n# Deep');
  expect(await text('/docs.md')).toBe('# Index');

  expect((await output.serve('/docs.md'))!.headers.get('Content-Type')).toBe(
    'text/markdown; charset=utf-8',
  );
  expect((await output.serve('/llms.txt'))!.headers.get('Content-Type')).toBe(
    'text/plain; charset=utf-8',
  );
  // a middleware calls the next handler
  expect(await output.serve('/docs/missing.md')).toBeUndefined();
  expect(await output.serve('/docs/misc/llms-full.txt')).toBeUndefined();
});

test('llms: renderUrl of files', async () => {
  const output = llms(guideDocs, {
    renderPage: renderTitle,
    renderUrl: (item) => `https://example.com${item.url}`,
  });

  expect(await (await output.serve('/llms.txt'))!.text()).toContain(
    '[Setup](https://example.com/docs/guide/setup.md)',
  );
  expect(output.index()).toContain('[Setup](https://example.com/docs/guide/setup)');
});

test('llms: filter', async () => {
  const output = llms(guideDocs, {
    renderPage: renderTitle,
    // a draft page
    filter: (page) => page.data.title !== 'Deep',
  });
  const text = async (path: string) => (await output.serve(path))!.text();

  expect(await text('/docs/guide/llms-full.txt')).toBe('# Guide\n\n# Setup');
  await expect(output.full()).resolves.not.toContain('# Deep');
  expect(await output.serve('/docs/guide/deep/page.md')).toBeUndefined();
  // keeps its page link
  expect(await text('/llms.txt')).toContain('[Deep](/docs/guide/deep/page)');
});

test('llms: files of groups and pages outside the page tree', async () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source: {
        files: [
          { type: 'meta', path: 'meta.json', data: { pages: ['(a)', '(b)'] } },
          { type: 'page', path: '(a)/one.mdx', data: { title: 'One' } },
          { type: 'page', path: '(a)/two.mdx', data: { title: 'Two' } },
          { type: 'page', path: '(b)/three.mdx', data: { title: 'Three' } },
          // only in the fallback page tree
          { type: 'page', path: 'api/x.mdx', data: { title: 'X' } },
          { type: 'page', path: 'api/y.mdx', data: { title: 'Y' } },
        ],
      },
    }),
    { renderPage: (page) => `# ${page.data.title}` },
  );

  // groups share `/docs`
  await expect(output.files()).resolves.toEqual([
    '/llms.txt',
    '/llms-full.txt',
    '/docs/one.md',
    '/docs/two.md',
    '/docs/three.md',
    '/docs/api/x.md',
    '/docs/api/y.md',
    '/docs/llms-full.txt',
    '/docs/api/llms-full.txt',
  ]);
  expect(await (await output.serve('/docs/api/llms-full.txt'))!.text()).toBe('# X\n\n# Y');
});

test('llms: files of i18n & encoded URLs', async () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      i18n: defineI18n({ defaultLanguage: 'en', languages: ['en', 'cn'] }),
      source: {
        files: [
          { type: 'page', path: 'guide/index.mdx', data: { title: 'Guide' } },
          { type: 'page', path: 'guide/start.mdx', data: { title: 'Start' } },
          { type: 'page', path: 'guide/index.cn.mdx', data: { title: '指南' } },
          { type: 'page', path: 'guide/入门.cn.mdx', data: { title: '入门' } },
          { type: 'page', path: '进阶/a.cn.mdx', data: { title: 'A' } },
          { type: 'page', path: '进阶/b.cn.mdx', data: { title: 'B' } },
        ],
      },
    }),
    { renderPage: (page) => `# ${page.data.title}` },
  );
  const text = async (path: string) => (await output.serve(path))!.text();

  // with the fallback of an untranslated page
  expect(await text('/cn/docs/guide/llms-full.txt')).toBe('# 指南\n\n# Start\n\n# 入门');
  // routers may pass decoded paths
  expect(await text('/cn/docs/guide/入门.md')).toBe('# 入门');
  expect(await text('/cn/docs/guide/%E5%85%A5%E9%97%A8.md')).toBe('# 入门');
  expect(await text('/cn/docs/进阶/llms-full.txt')).toBe('# A\n\n# B');
});

test('llms: languages without the locale in URLs', async () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      i18n: defineI18n({ defaultLanguage: 'en', languages: ['en', 'cn'], hideLocale: 'always' }),
      source: {
        files: [
          { type: 'page', path: 'guide/a.mdx', data: { title: 'A' } },
          { type: 'page', path: 'guide/b.mdx', data: { title: 'B' } },
          { type: 'page', path: 'guide/a.cn.mdx', data: { title: '甲' } },
          { type: 'page', path: 'guide/b.cn.mdx', data: { title: '乙' } },
        ],
      },
    }),
    { renderPage: (page) => `# ${page.data.title}` },
  );
  const text = async (path: string, lang: string) => (await output.serve(path, lang))!.text();

  await expect(output.files('cn')).resolves.toContain('/docs/guide/llms-full.txt');
  expect(await text('/docs/guide/llms-full.txt', 'cn')).toBe('# 甲\n\n# 乙');
  expect(await text('/docs/guide/a.md', 'cn')).toBe('# 甲');
  expect(await text('/docs/guide/a.md', 'en')).toBe('# A');
  expect(await text('/llms.txt', 'cn')).not.toContain('[A]');
});

test('llms: types', () => {
  const output = llms(guideDocs, {
    renderPage: renderTitle,
    filter: (page) => {
      expectTypeOf(page).toEqualTypeOf<(typeof guideDocs)['$inferPage']>();
      return true;
    },
  });

  expectTypeOf(output.files).returns.resolves.toEqualTypeOf<string[]>();
  expectTypeOf(output.serve).returns.resolves.toEqualTypeOf<Response | undefined>();
  // without `renderPage`, there are no files
  expectTypeOf(llms(guideDocs)).not.toHaveProperty('serve');
});
