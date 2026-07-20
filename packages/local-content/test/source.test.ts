import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalSource } from '@/source';
import type { RawPage } from '@/storage';

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-content-'));
  await fs.writeFile(path.join(dir, 'index.md'), '---\ntitle: Index\n---\n\nhello\n');
  await fs.writeFile(path.join(dir, 'guide.md'), '---\ntitle: Guide\n---\n\nguide body\n');
  await fs.writeFile(path.join(dir, 'meta.json'), '{"title":"Docs","pages":["index"]}');
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function source(load: (page: RawPage) => Promise<unknown> = async (page) => `loaded:${page.path}`) {
  return createLocalSource({ dir, load });
}

describe('createLocalSource', () => {
  test('scans pages and meta into virtual files', async () => {
    const { files } = await source().staticSource();

    expect(files.map((file) => `${file.type}:${file.path}`).sort()).toEqual([
      'meta:meta.json',
      'page:guide.md',
      'page:index.md',
    ]);
  });

  test('reads title from frontmatter, falling back to the file name', async () => {
    const { files } = await source().staticSource();
    const titles = files
      .filter((file) => file.type === 'page')
      .map((file) => file.data.title)
      .sort();

    expect(titles).toEqual(['Guide', 'Index']);
  });

  test('applies baseDir to virtual paths', async () => {
    const { files } = await source().staticSource({ baseDir: 'docs' });

    expect(files.every((file) => file.path.startsWith(`docs${path.sep}`))).toBe(true);
  });

  test('load() runs once per page and is cached', async () => {
    let calls = 0;
    const instance = source(async (page) => {
      calls++;
      return `loaded:${page.path}`;
    });

    const { files } = await instance.staticSource();
    const page = files.find((file) => file.path === 'guide.md');
    if (page?.type !== 'page') throw new Error('expected guide.md');

    await expect(page.data.load()).resolves.toBe('loaded:guide.md');
    await page.data.load();
    expect(calls).toBe(1);
  });

  test('staticSource is cached until a file is invalidated', async () => {
    const instance = source();
    const first = await instance.staticSource();
    expect(await instance.staticSource()).toBe(first);

    instance.invalidateFile(path.join(dir, 'guide.md'));
    expect(await instance.staticSource()).not.toBe(first);
  });

  test('invalidateFile recompiles only the changed page', async () => {
    const loaded: string[] = [];
    const instance = source(async (page) => {
      loaded.push(page.path);
      return page.content;
    });

    let files = (await instance.staticSource()).files;
    for (const file of files) if (file.type === 'page') await file.data.load();
    expect(loaded).toHaveLength(2);

    loaded.length = 0;
    instance.invalidateFile(path.join(dir, 'guide.md'));

    files = (await instance.staticSource()).files;
    for (const file of files) if (file.type === 'page') await file.data.load();
    // the untouched page keeps its cached result
    expect(loaded).toEqual(['guide.md']);
  });

  test('dynamicSource notifies registered loaders on invalidation', async () => {
    const instance = source();
    const dynamic = instance.dynamicSource();
    let invalidated = 0;
    dynamic.configure?.({ invalidate: () => void invalidated++ } as never);

    expect(await dynamic.files()).toHaveLength(3);
    instance.invalidateFile(path.join(dir, 'guide.md'));
    expect(invalidated).toBe(1);
  });

  test('include narrows which files are scanned', async () => {
    const instance = createLocalSource({
      dir,
      include: ['*.json'],
      load: async () => null,
    });

    const { files } = await instance.staticSource();
    expect(files.map((file) => file.path)).toEqual(['meta.json']);
  });
});
