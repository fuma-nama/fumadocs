import { expect, test } from 'vitest';
import { addTanstackPrerender } from '@/codemod/tanstack-start';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  addReactRouterRoute,
  filterReactRouterPrerenderArray,
  filterReactRouterRoute,
} from '@/codemod/react-router';
import {
  addImport,
  addJsxAttribute,
  findJsxElement,
  parseSourceFile,
  prependJsxChildren,
} from '@/codemod/shared';
import { addVitePlugin, wrapNextConfig } from '@/codemod/config';

async function createSourceFile(templatePath: string) {
  const content = await fs.readFile(path.join(__dirname, templatePath), 'utf-8');
  return parseSourceFile('temp.ts', content);
}

test('transform tanstack start vite config: add pages', async () => {
  const sourceFile = await createSourceFile('fixtures/tanstack-vite-config.txt');
  addTanstackPrerender(sourceFile, ['/static.json', '/docs/test']);
  await expect(sourceFile.s.toString()).toMatchFileSnapshot(
    'fixtures/tanstack-vite-config(add-pages).output.txt',
  );
});

test('transform tanstack start vite config: extend pages', async () => {
  const sourceFile = parseSourceFile(
    'temp.ts',
    `export default defineConfig({
  plugins: [tanstackStart({ pages: [{ path: '/a' }] })],
});
`,
  );
  addTanstackPrerender(sourceFile, ['/a', '/b']);
  expect(sourceFile.s.toString()).toMatchInlineSnapshot(`
    "export default defineConfig({
      plugins: [tanstackStart({ pages: [{ path: '/a' }, { path: '/b' }] })],
    });
    "
  `);
});

test('transform react router routes: add routes', async () => {
  const sourceFile = await createSourceFile('fixtures/react-router-routes.txt');
  addReactRouterRoute(sourceFile, [
    {
      path: 'api/og/*',
      entry: './api/og.tsx',
    },
    {
      path: '/static.json',
      entry: './static.ts',
    },
  ]);
  await expect(sourceFile.s.toString()).toMatchFileSnapshot(
    'fixtures/react-router-routes(add-routes).output.txt',
  );
});

test('transform react router routes: filter routes', async () => {
  const sourceFile = await createSourceFile('fixtures/react-router-routes.txt');
  filterReactRouterRoute(sourceFile, ({ path }) => path !== 'api/search');
  await expect(sourceFile.s.toString()).toMatchFileSnapshot(
    'fixtures/react-router-routes(filter-routes).output.txt',
  );
});

test('transform react router config: remove exclude', async () => {
  const sourceFile = await createSourceFile('fixtures/react-router-config.txt');
  filterReactRouterPrerenderArray(sourceFile, 'excluded', (v) => v !== '/api/search');
  await expect(sourceFile.s.toString()).toMatchFileSnapshot(
    'fixtures/react-router-config(remove-exclude).output.txt',
  );
});

test('transform jsx', () => {
  const sourceFile = parseSourceFile(
    'layout.tsx',
    `import { RootProvider } from 'fumadocs-ui/provider';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html>
      <RootProvider theme={{ enabled: false }}>
        <DocsLayout
          tree={source.pageTree}
          nav={{ title: 'Docs' }}
        >
          {children}
          <Footer />
        </DocsLayout>
      </RootProvider>
    </html>
  );
}
`,
  );
  addJsxAttribute(
    sourceFile,
    findJsxElement(sourceFile, 'RootProvider')!.openingElement,
    'search={{ SearchDialog }}',
  );
  addJsxAttribute(
    sourceFile,
    findJsxElement(sourceFile, 'DocsLayout')!.openingElement,
    'sidebar={{ collapsible: false }}',
  );
  prependJsxChildren(
    sourceFile,
    findJsxElement(sourceFile, 'DocsLayout')!,
    '<AISearch>\n  <AISearchTrigger />\n</AISearch>',
  );
  addImport(sourceFile, { from: '@/components/search', default: 'SearchDialog' });
  addImport(sourceFile, { from: '@/components/ai', named: ['AISearch', 'AISearchTrigger'] });
  expect(sourceFile.s.toString()).toMatchInlineSnapshot(`
    "import { RootProvider } from 'fumadocs-ui/provider';
    import SearchDialog from '@/components/search';
    import { AISearch, AISearchTrigger } from '@/components/ai';

    export default function Layout({ children }: LayoutProps<'/'>) {
      return (
        <html>
          <RootProvider theme={{ enabled: false }} search={{ SearchDialog }}>
            <DocsLayout
              tree={source.pageTree}
              nav={{ title: 'Docs' }}
              sidebar={{ collapsible: false }}
            >
              <AISearch>
                <AISearchTrigger />
              </AISearch>

              {children}
              <Footer />
            </DocsLayout>
          </RootProvider>
        </html>
      );
    }
    "
  `);
});

test('add named imports to an existing declaration', () => {
  const file = parseSourceFile('temp.ts', `import { index, type RouteConfig } from 'a';\n`);
  addImport(file, { from: 'a', named: ['index', 'route'] });
  addImport(file, { from: 'b', named: ['x'] });
  expect(file.s.toString()).toMatchInlineSnapshot(`
    "import { index, type RouteConfig, route } from 'a';
    import { x } from 'b';
    "
  `);
});

test('add vite plugin', () => {
  const file = parseSourceFile(
    'vite.config.ts',
    `import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
`,
  );
  expect(addVitePlugin(file, { name: 'fumadocsMdx', from: 'fumadocs-mdx/vite' })).toBe(true);
  expect(file.s.toString()).toMatchInlineSnapshot(`
    "import { defineConfig } from 'vite';
    import { fumadocsMdx } from 'fumadocs-mdx/vite';

    export default defineConfig({
      plugins: [react(), fumadocsMdx()],
    });
    "
  `);
});

test('add vite plugin: nested path & skip existing', () => {
  const file = parseSourceFile(
    'waku.config.ts',
    `export default defineConfig({
  vite: { plugins: [fumadocsMdx()] },
});
`,
  );
  expect(
    addVitePlugin(file, { name: 'fumadocsMdx', from: 'fumadocs-mdx/vite' }, ['vite', 'plugins']),
  ).toBe(true);
  expect(file.s.hasChanged()).toBe(false);
});

test('wrap next config', () => {
  const file = parseSourceFile(
    'next.config.mjs',
    `const config = {
  reactStrictMode: true,
};

export default config;
`,
  );
  expect(wrapNextConfig(file)).toBe(true);
  expect(file.s.toString()).toMatchInlineSnapshot(`
    "import { createMDX } from 'fumadocs-mdx/next';

    const config = {
      reactStrictMode: true,
    };

    const withMDX = createMDX();

    export default withMDX(config);
    "
  `);
});
