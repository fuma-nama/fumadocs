import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalSource, type ContentIntegration } from '@/index';

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-content-'));
  await fs.writeFile(path.join(dir, 'index.md'), 'hello');
  await fs.writeFile(path.join(dir, 'guide.md'), 'guide body');
  await fs.writeFile(path.join(dir, 'meta.json'), '{"title":"Docs"}');
  await fs.writeFile(path.join(dir, 'notes.txt'), 'plain text');
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

type Page = { title: string; text?: string; load?: () => Promise<string> };
type Meta = { title?: string };

/** pages from `.md`, meta from `.json`, everything else skipped */
function integration(onParse?: (path: string) => void): ContentIntegration<Page, Meta> {
  return {
    include: ['*.md', '*.json'],
    async parse(file) {
      onParse?.(file.path);

      if (file.path.endsWith('.json')) {
        return { type: 'meta', data: JSON.parse(await file.read()) as Meta };
      }

      return {
        type: 'page',
        data: {
          title: path.basename(file.path, '.md'),
          load: () => file.read(),
        },
      };
    },
  };
}

describe('createLocalSource', () => {
  test('scans through the integration', async () => {
    const { files } = await createLocalSource({ dir, integration: integration() }).staticSource();

    expect(files.map((file) => `${file.type}:${file.path}`).sort()).toEqual([
      'meta:meta.json',
      'page:guide.md',
      'page:index.md',
    ]);
  });

  test('passes the integration data through untouched', async () => {
    const { files } = await createLocalSource({ dir, integration: integration() }).staticSource();

    const meta = files.find((file) => file.path === 'meta.json');
    if (meta?.type !== 'meta') throw new Error('expected meta.json');
    expect(meta.data).toEqual({ title: 'Docs' });

    const page = files.find((file) => file.path === 'guide.md');
    if (page?.type !== 'page') throw new Error('expected guide.md');
    expect(page.data.title).toBe('guide');
    expect(await page.data.load?.()).toBe('guide body');
  });

  test('applies baseDir to virtual paths', async () => {
    const source = createLocalSource({ dir, integration: integration() });
    const { files } = await source.staticSource({ baseDir: 'docs' });

    expect(files.every((file) => file.path.startsWith(`docs${path.sep}`))).toBe(true);
  });

  test('staticSource is cached until a file is invalidated', async () => {
    const source = createLocalSource({ dir, integration: integration() });
    const first = await source.staticSource();
    expect(await source.staticSource()).toBe(first);

    source.invalidateFile(path.join(dir, 'guide.md'));
    expect(await source.staticSource()).not.toBe(first);
  });

  test('invalidateFile reparses only the changed file', async () => {
    const parsed: string[] = [];
    const source = createLocalSource({ dir, integration: integration((p) => parsed.push(p)) });

    await source.staticSource();
    expect(parsed).toHaveLength(3);

    parsed.length = 0;
    source.invalidateFile(path.join(dir, 'guide.md'));
    await source.staticSource();
    expect(parsed).toEqual(['guide.md']);
  });

  test('invalidateAll reparses every file', async () => {
    const parsed: string[] = [];
    const source = createLocalSource({ dir, integration: integration((p) => parsed.push(p)) });

    await source.staticSource();
    parsed.length = 0;
    source.invalidateAll();
    await source.staticSource();

    expect(parsed.sort()).toEqual(['guide.md', 'index.md', 'meta.json']);
  });

  test('dynamicSource notifies registered loaders', async () => {
    const source = createLocalSource({ dir, integration: integration() });
    const dynamic = source.dynamicSource();
    let invalidated = 0;
    dynamic.configure?.({ invalidate: () => void invalidated++ } as never);

    expect(await dynamic.files()).toHaveLength(3);
    source.invalidateFile(path.join(dir, 'guide.md'));
    expect(invalidated).toBe(1);
  });

  test('include overrides the integration patterns', async () => {
    const source = createLocalSource({ dir, include: ['*.json'], integration: integration() });

    const { files } = await source.staticSource();
    expect(files.map((file) => file.path)).toEqual(['meta.json']);
  });

  test('exposes dir and include for watcher adapters', () => {
    const source = createLocalSource({ dir, integration: integration() });

    expect(source.dir).toBe(path.resolve(dir));
    expect(source.include).toEqual(['*.md', '*.json']);
  });

  test('a file the integration skips is left out', async () => {
    const source = createLocalSource({
      dir,
      include: ['*'],
      integration: {
        include: ['*'],
        async parse(file) {
          if (!file.path.endsWith('.txt')) return undefined;
          return { type: 'page', data: { title: file.path, text: await file.read() } };
        },
      },
    });

    const { files } = await source.staticSource();
    expect(files.map((file) => file.path)).toEqual(['notes.txt']);
  });

  test('a throwing parse is reported and skipped, not fatal', async () => {
    const source = createLocalSource({
      dir,
      include: ['*.md'],
      integration: {
        include: ['*.md'],
        async parse(file) {
          if (file.path === 'guide.md') throw new Error('boom');
          return { type: 'page', data: { title: file.path } };
        },
      },
    });

    const { files } = await source.staticSource();
    expect(files.map((file) => file.path)).toEqual(['index.md']);
  });
});
