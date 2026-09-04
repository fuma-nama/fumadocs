import { expect, test } from 'vitest';
import { addTanstackPrerender } from '@/transform/tanstack-start';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  addReactRouterRoute,
  filterReactRouterPrerenderArray,
  filterReactRouterRoute,
} from '@/transform/react-router';
import {
  addImport,
  addJsxAttribute,
  findJsxElement,
  parseSourceFile,
  prependJsxChildren,
} from '@/transform/shared';

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
