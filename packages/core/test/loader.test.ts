import { expect, test } from 'vitest';
import { createGetUrl, getSlugs, loader, LoaderOptions, Source } from '@/source';
import type { ReactElement } from 'react';
import { removeUndefined } from '@/utils/remove-undefined';
import { lucideIconsPlugin } from '@/source/plugins/lucide-icons';

test('get slugs', () => {
  expect(getSlugs('index.mdx')).toStrictEqual([]);
  expect(getSlugs('page.mdx')).toStrictEqual(['page']);

  expect(getSlugs('nested/index.mdx')).toStrictEqual(['nested']);
  expect(getSlugs('nested/page.mdx')).toStrictEqual(['nested', 'page']);
});

test('get slugs: folder groups', () => {
  expect(getSlugs('(nested)/index.mdx')).toStrictEqual([]);
  expect(getSlugs('folder/(nested)/page.mdx')).toStrictEqual(['folder', 'page']);

  expect(() => getSlugs('nested/(page).mdx')).toThrowError();
});

test('Get URL: Empty', () => {
  const getUrl = createGetUrl('');
  expect(getUrl(['docs', 'hello'])).toBe('/docs/hello');
  expect(getUrl([''])).toBe('/');
  expect(getUrl([])).toBe('/');
});

test('Get URL: Base', () => {
  const getUrl = createGetUrl('/docs');
  expect(getUrl(['docs', 'hello'])).toBe('/docs/docs/hello');
  expect(getUrl([''])).toBe('/docs');
});

const pageTreeTests: {
  title: string;
  output: string;
  source: Source;
  loader?: Partial<LoaderOptions>;
}[] = [
  {
    title: 'Basic',
    source: (await import('./fixtures/page-trees/basic')).source,
    output: './fixtures/page-trees/basic.tree.json',
  },
  {
    title: 'Basic: no meta.json',
    source: (await import('./fixtures/page-trees/basic')).noMeta,
    output: './fixtures/page-trees/basic-no-meta.tree.json',
  },
  {
    title: 'Rest',
    source: (await import('./fixtures/page-trees/rest')).source,
    output: './fixtures/page-trees/rest.tree.json',
  },
  {
    title: 'Rest: priority',
    source: (await import('./fixtures/page-trees/rest')).withPriority,
    output: './fixtures/page-trees/rest-priority.tree.json',
  },
  {
    title: 'Nested Directory',
    source: (await import('./fixtures/page-trees/nested')).source,
    output: './fixtures/page-trees/nested.tree.json',
  },
  {
    title: 'Internationalized Routing',
    source: (await import('./fixtures/page-trees/i18n')).source,
    output: './fixtures/page-trees/i18n.tree.json',
    loader: {
      i18n: {
        languages: ['cn', 'en'],
        defaultLanguage: 'en',
      },
    },
  },
  {
    title: 'Internationalized Routing: No Prefix',
    source: (await import('./fixtures/page-trees/i18n')).source,
    output: './fixtures/page-trees/i18n-no-prefix.tree.json',
    loader: {
      i18n: {
        languages: ['cn', 'en'],
        defaultLanguage: 'en',
        hideLocale: 'default-locale',
      },
    },
  },
  {
    title: 'Internationalized Routing: dir',
    source: (await import('./fixtures/page-trees/i18n-dir')).source,
    output: './fixtures/page-trees/i18n-dir.test.json',
    loader: {
      i18n: {
        parser: 'dir',
        languages: ['cn', 'en'],
        defaultLanguage: 'en',
      },
    },
  },
  {
    title: 'Circular Reference',
    source: (await import('./fixtures/page-trees/circular')).source,
    output: './fixtures/page-trees/circular.test.json',
  },
];

for (const pageTreeTest of pageTreeTests) {
  test(`Page Tree: ${pageTreeTest.title}`, async () => {
    const source = loader(pageTreeTest.source, {
      baseUrl: '/',
      pageTree: {
        noRef: true,
      },
      ...pageTreeTest.loader,
    });

    await expect(removeUndefined(source.pageTree, true)).toMatchFileSnapshot(pageTreeTest.output);
  });
}

test('Loader: Simple', async () => {
  const result = loader({
    baseUrl: '/',
    source: (await import('./fixtures/page-trees/basic')).source,
  });

  expect(result.getPages().length).toBe(1);
  expect(result.getPage(['test'])).toBeDefined();
});

test('Nested Directories', async () => {
  const result = loader({
    baseUrl: '/',
    icon: (v) => v as unknown as ReactElement,
    source: (await import('./fixtures/page-trees/nested')).source,
  });

  expect(result.getPages().map((page) => page.slugs.join('/'))).toMatchInlineSnapshot(`
      [
        "test",
        "hidden",
        "hello/index",
        "nested/test",
        "hello",
      ]
    `);
  // page in folder
  expect(result.getPage(['nested', 'test'])).toBeDefined();

  // page in folder group
  expect(result.getPage(['hello'])).toBeDefined();
});

test('Internationalized Routing', async () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
    },
    source: (await import('./fixtures/page-trees/i18n')).source,
  });

  await expect(removeUndefined(result.getLanguages(), true)).toMatchFileSnapshot(
    './fixtures/page-trees/i18n.entries.json',
  );
});

test('Internationalized Routing: Hide Prefix', async () => {
  const result = loader({
    baseUrl: '/',
    i18n: {
      languages: ['cn', 'en'],
      defaultLanguage: 'en',
      hideLocale: 'default-locale',
    },
    source: (await import('./fixtures/page-trees/i18n')).source,
  });
  expect(result.getPages().length).toBe(4);
  expect(result.getPage(['test'])?.url).toBe('/test');
  expect(result.getPage(['test'], 'cn')?.url).toBe('/cn/test');
});

test('Loader: Allow duplicate pages when explicitly referenced twice', () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    source: {
      files: [
        {
          type: 'meta',
          path: 'meta.json',
          data: {
            pages: ['page1', 'page1', 'page2'],
          },
        },
        {
          type: 'page',
          path: 'page1.mdx',
          data: {
            title: 'Page 1',
          },
        },
        {
          type: 'page',
          path: 'page2.mdx',
          data: {
            title: 'Page 2',
          },
        },
      ],
    },
  });

  const treeChildren = result.pageTree.children;
  expect(treeChildren.length).toBe(3);
  expect(treeChildren[0].$id).toBe('page1.mdx');
  expect(treeChildren[1].$id).toBe('page1.mdx');
  expect(treeChildren[2].$id).toBe('page2.mdx');
});

test('Loader: No duplicate pages when referencing subfolder items and folder', () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    source: {
      files: [
        {
          type: 'meta',
          path: 'meta.json',
          data: {
            pages: [
              'index',
              'subfolder/page1', // Reference specific page in subfolder
              'subfolder/page2', // Reference another specific page
              'other-page',
              'subfolder', // Reference the entire folder
            ],
          },
        },
        {
          type: 'page',
          path: 'index.mdx',
          data: {
            title: 'Home',
          },
        },
        {
          type: 'page',
          path: 'other-page.mdx',
          data: {
            title: 'Other Page',
          },
        },
        {
          type: 'page',
          path: 'subfolder/page1.mdx',
          data: {
            title: 'Subfolder Page 1',
          },
        },
        {
          type: 'page',
          path: 'subfolder/page2.mdx',
          data: {
            title: 'Subfolder Page 2',
          },
        },
        {
          type: 'page',
          path: 'subfolder/page3.mdx',
          data: {
            title: 'Subfolder Page 3',
          },
        },
      ],
    },
  });

  // Check that pages are not duplicated
  const pages = result.getPages();
  const pagePaths = pages.map((page) => page.slugs.join('/'));

  // Should have exactly 5 pages total
  expect(pages.length).toBe(5);

  // Check that each page appears only once
  const uniquePaths = new Set(pagePaths);
  expect(uniquePaths.size).toBe(pagePaths.length);

  // Verify all pages are present
  expect(pagePaths.sort()).toEqual([
    '', // index
    'other-page',
    'subfolder/page1',
    'subfolder/page2',
    'subfolder/page3',
  ]);

  // Check the page tree structure
  expect(removeUndefined(result.pageTree, true), 'Page Tree').toMatchInlineSnapshot(`
    {
      "$id": "root",
      "children": [
        {
          "$id": "index.mdx",
          "name": "Home",
          "type": "page",
          "url": "/",
        },
        {
          "$id": "subfolder/page1.mdx",
          "name": "Subfolder Page 1",
          "type": "page",
          "url": "/subfolder/page1",
        },
        {
          "$id": "subfolder/page2.mdx",
          "name": "Subfolder Page 2",
          "type": "page",
          "url": "/subfolder/page2",
        },
        {
          "$id": "other-page.mdx",
          "name": "Other Page",
          "type": "page",
          "url": "/other-page",
        },
        {
          "$id": "subfolder",
          "children": [
            {
              "$id": "subfolder/page3.mdx",
              "name": "Subfolder Page 3",
              "type": "page",
              "url": "/subfolder/page3",
            },
          ],
          "name": "Subfolder",
          "type": "folder",
        },
      ],
      "name": "Docs",
    }
  `);
});

test('Loader: Serialize data', async () => {
  const result = loader({
    baseUrl: '/',
    pageTree: {
      noRef: true,
    },
    plugins: [lucideIconsPlugin()],
    source: {
      files: [
        {
          type: 'page',
          path: 'test.mdx',
          data: {
            icon: 'Rocket',
            title: 'Hello <Foo>',
          },
        },
        {
          type: 'meta',
          path: 'hello/meta.json',
          data: {
            title: 'Hello Folder',
            pages: ['---[Timer]Hello World---', 'index'],
          },
        },
        {
          type: 'page',
          path: 'hello/index.mdx',
          data: {
            title: 'Hello',
          },
        },
      ],
    },
  });

  removeUndefined(result.pageTree, true);
  const prev = JSON.stringify(result.pageTree);

  expect(await result.serializePageTree(result.pageTree)).toMatchInlineSnapshot(`
    {
      "$fumadocs_loader": "page-tree",
      "data": {
        "$id": "root",
        "children": [
          {
            "$id": "test.mdx",
            "icon": "<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rocket" aria-hidden="true"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>",
            "name": "Hello &lt;Foo&gt;",
            "type": "page",
            "url": "/test",
          },
          {
            "$id": "hello",
            "children": [
              {
                "$id": "_0",
                "icon": "<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer" aria-hidden="true"><line x1="10" x2="14" y1="2" y2="2"></line><line x1="12" x2="15" y1="14" y2="11"></line><circle cx="12" cy="14" r="8"></circle></svg>",
                "name": "Hello World",
                "type": "separator",
              },
              {
                "$id": "hello/index.mdx",
                "name": "Hello",
                "type": "page",
                "url": "/hello",
              },
            ],
            "name": "Hello Folder",
            "type": "folder",
          },
        ],
        "name": "Docs",
      },
    }
  `);

  expect(JSON.stringify(result.pageTree), 'page tree unchanged').toBe(prev);
});
