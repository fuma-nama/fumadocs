import { describe, expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import type { MDXComponents } from 'mdx/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { dynamicLoader, loader } from 'fumadocs-core/source';
import { convert, createPython, type ModuleInterface } from '@/index';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/demo.json');

// the real components highlight code asynchronously, stub them to inspect props
const components: MDXComponents = {
  Tabs: ({ items, children }) => createElement('div', { 'data-tabs': items.join() }, children),
  Tab: ({ value, children }) => createElement('section', { 'data-tab': value }, children),
  Cards: ({ children }) => createElement('nav', {}, children),
  Card: ({ title, href }) => createElement('a', { href }, title),
  Callout: ({ title, type, children }) =>
    createElement('aside', { 'data-type': type }, title, children),
};
for (const name of [
  'PyFunction',
  'PyAttributes',
  'PyAttribute',
  'PyParameter',
  'PySourceCode',
  'PyFunctionReturn',
]) {
  components[name] = ({ children, ...props }) =>
    createElement('section', { 'data-component': name, ...props }, children);
}

describe('convert', () => {
  test('generates one MDX file per module and class', async () => {
    const files = convert(JSON.parse(await fs.readFile(file, 'utf-8')), { baseUrl: '/docs' });

    expect(files.map((file) => file.path)).toEqual([
      'demo/GitInfo.mdx',
      'demo/logger/Logger.mdx',
      'demo/logger/index.mdx',
      'demo/utils.mdx',
      'demo/index.mdx',
    ]);
    await expect(files[4].content).toMatchFileSnapshot('__snapshots__/demo-index.mdx');
    await expect(files[0].content).toMatchFileSnapshot('__snapshots__/demo-GitInfo.mdx');
  });
});

describe('createPython', () => {
  test('exposes pages as a static source', async () => {
    const source = await createPython({ file }).staticSource();

    expect(source.files.map((file) => [file.path, file.data.title])).toEqual([
      ['demo/GitInfo.mdx', 'GitInfo'],
      ['demo/logger/Logger.mdx', 'Logger'],
      ['demo/logger/index.mdx', 'logger'],
      ['demo/utils.mdx', 'utils'],
      ['demo/index.mdx', 'demo'],
    ]);
  });

  test('compiles pages at most once and renders without evaluating JavaScript', async () => {
    const loader = dynamicLoader(createPython({ file }).dynamicSource(), {
      baseUrl: '/docs',
    });
    const source = await loader.get();
    const page = source.getPage(['demo']);
    expect(page).toBeDefined();

    const renderer = await page!.data.load();
    await expect(page!.data.load()).resolves.toBe(renderer);
    const structuredData = await page!.data.structuredData();
    await expect(page!.data.structuredData()).resolves.toBe(structuredData);
    expect(structuredData.contents[0]).toEqual({ heading: undefined, content: 'A demo package.' });

    const { body, toc } = await renderer.render(components);
    expect(toc).toEqual([]);

    const html = renderToStaticMarkup(createElement('div', {}, body));
    // links to classes and modules resolve to pages of the same loader
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      expect(source.getPageByHref(href)?.page.url).toBe(href);
    }
    // code blocks carry Shiki and Fumadocs UI markup, keep the snapshot to the page structure
    await expect(
      html.replaceAll(/<figure[^>]*shiki[\s\S]*?<\/figure>/g, '<figure />'),
    ).toMatchFileSnapshot('__snapshots__/demo-index.html');
  });

  test('resolves links under a base directory', async () => {
    const source = loader(await createPython({ file }).staticSource({ baseDir: 'api' }), {
      baseUrl: '/docs',
    });
    const { body } = await (await source.getPage(['api', 'demo'])!.data.load()).render(components);

    expect(renderToStaticMarkup(createElement('div', {}, body))).toContain(
      '<a href="/docs/api/demo/GitInfo">GitInfo</a>',
    );
  });

  test('badges pages in the page tree', async () => {
    const python = createPython({ file });
    const source = loader(await python.staticSource(), {
      baseUrl: '/docs',
      plugins: [python.loaderPlugin()],
    });
    const names = new Map<string, string>();
    function collect(nodes: (typeof source.pageTree)['children']) {
      for (const node of nodes) {
        names.set(
          node.type === 'page' ? node.url : String(node.name),
          renderToStaticMarkup(node.name),
        );
        if (node.type === 'folder') collect(node.children);
      }
    }
    collect(source.pageTree.children);

    expect(names.get('/docs/demo/GitInfo')).toContain('>class</span>');
    expect(names.get('/docs/demo/utils')).toContain('>module</span>');
    // folders stay plain
    expect(names.get('logger')).toBe('logger');
  });

  test('renders with the default components', async () => {
    const source = loader(await createPython({ file }).staticSource(), { baseUrl: '/docs' });
    const renderer = await source.getPage(['demo'])!.data.load();

    const { body } = await renderer.render();
    expect(body).toBeDefined();
  });

  test('keeps docstring markdown as data', () => {
    const mod: ModuleInterface = {
      name: 'x',
      path: 'x',
      description: 'Formats `{name}` with <b>html</b> and {curly}',
      docstring: null,
      modules: {},
      attributes: [],
      classes: {},
      functions: {},
    };

    expect(convert(mod)[0].content).toBe('Formats `{name}` with \\<b>html\\</b> and \\{curly}\n');
  });
});
