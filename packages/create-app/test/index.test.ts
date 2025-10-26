import { expect, test } from 'vitest';
import { IndentationText, Project, QuoteKind } from 'ts-morph';
import { addTanstackPrerender } from '@/transform/tanstack-start';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  addReactRouterRoute,
  filterReactRouterPrerenderArray,
  filterReactRouterRoute,
} from '@/transform/react-router';

const project = new Project({
  useInMemoryFileSystem: true,
  manipulationSettings: {
    indentationText: IndentationText.TwoSpaces,
    quoteKind: QuoteKind.Single,
  },
});

async function createSourceFile(templatePath: string) {
  const content = (
    await fs.readFile(path.join(__dirname, templatePath))
  ).toString();

  return project.createSourceFile('temp.ts', content, {
    overwrite: true,
  });
}

test('transform tanstack start vite config: add pages', async () => {
  const sourceFile = await createSourceFile(
    'fixtures/tanstack-vite-config.txt',
  );
  addTanstackPrerender(sourceFile, ['/static.json', '/docs/test']);
  await expect(sourceFile.getFullText()).toMatchFileSnapshot(
    'fixtures/tanstack-vite-config(add-pages).output.txt',
  );
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
  await expect(sourceFile.getFullText()).toMatchFileSnapshot(
    'fixtures/react-router-routes(add-routes).output.txt',
  );
});

test('transform react router routes: filter routes', async () => {
  const sourceFile = await createSourceFile('fixtures/react-router-routes.txt');
  filterReactRouterRoute(sourceFile, ({ path }) => path !== 'api/search');
  await expect(sourceFile.getFullText()).toMatchFileSnapshot(
    'fixtures/react-router-routes(filter-routes).output.txt',
  );
});

test('transform react router config: remove exclude', async () => {
  const sourceFile = await createSourceFile('fixtures/react-router-config.txt');
  filterReactRouterPrerenderArray(
    sourceFile,
    'excluded',
    (v) => v !== '/api/search',
  );
  await expect(sourceFile.getFullText()).toMatchFileSnapshot(
    'fixtures/react-router-config(remove-exclude).output.txt',
  );
});
