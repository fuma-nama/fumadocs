import { afterEach, describe, expect, test, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { obsidian } from '@/index';
import * as ObsidianComponents from '@/ui';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(cwd, 'fixtures');
const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('obsidian source', () => {
  test('builds pages directly from a vault', async () => {
    const source = await obsidian({ dir: fixturesDir }).staticSource();
    const pages = source.files
      .filter((file) => file.type === 'page')
      .map((file) => ({ path: file.path, title: file.data.title }))
      .sort((a, b) => a.path.localeCompare(b.path));

    expect(pages).toEqual([
      { path: 'create a link.md', title: 'create a link' },
      { path: 'hello world.md', title: 'hello world' },
      { path: 'Welcome.md', title: 'Welcome' },
    ]);
    expect(source.files.some((file) => file.path === 'Xmas.png')).toBe(false);
  });

  test('resolves Obsidian syntax while compiling in memory', async () => {
    const source = await obsidian({
      dir: fixturesDir,
      url: (file) => `/vault/${file}`,
      // the fixture media does not exist in a public directory
      remarkImageOptions: false,
    }).staticSource();
    const page = source.files.find((file) => file.path === 'Welcome.md');
    if (page?.type !== 'page') throw new Error('expected Welcome.md');

    const renderer = await page.data.load();
    const { body, toc } = await renderer.render({
      ...ObsidianComponents,
      Card: ({ href, children }) => createElement('a', { href }, children),
    });
    const html = renderToStaticMarkup(body);

    expect(html).toContain('href="./create%20a%20link.md"');
    expect(html).toContain('src="/vault/Xmas.png"');
    expect(html).toContain('id="^123d4"');
    expect(html).toContain('Hello World');
    expect(html).not.toContain('<strong>hidden</strong>');
    expect(toc.map((item) => item.url)).toContain('#introduction');
  });

  test('compiles a page once', async () => {
    let compiles = 0;
    const source = await obsidian({
      dir: fixturesDir,
      remarkPlugins: [() => () => void compiles++],
    }).staticSource();
    const page = source.files.find((file) => file.path === 'hello world.md');
    if (page?.type !== 'page') throw new Error('expected hello world.md');

    expect(page.data.title).toBe('hello world');
    await page.data.load();
    await page.data.load();
    expect(compiles).toBe(1);
  });

  test('applies baseDir to virtual paths', async () => {
    const source = await obsidian({ dir: fixturesDir }).staticSource({ baseDir: 'vault' });
    const paths = source.files.map((file) => file.path);

    expect(paths).toContain(path.join('vault', 'Welcome.md'));
  });

  test('loads meta.json files', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'index.md'), '# Home');
    await fs.writeFile(path.join(dir, 'meta.json'), '{"title":"Vault"}');

    const source = await obsidian({ dir }).staticSource();
    const meta = source.files.find((file) => file.path === 'meta.json');

    expect(meta?.type).toBe('meta');
    expect(meta?.data.title).toBe('Vault');
  });

  test('rebuilds cross-file links after invalidation', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'a.md'), '[[Target]]');
    await fs.writeFile(path.join(dir, 'b.md'), '---\naliases: [Target]\n---\n\n# B');
    const instance = obsidian({ dir });
    const first = await instance.staticSource();
    const firstPage = first.files.find((file) => file.path === 'a.md');
    if (firstPage?.type !== 'page') throw new Error('expected a.md');
    const firstHtml = renderToStaticMarkup((await (await firstPage.data.load()).render()).body);
    expect(firstHtml).toContain('href="./b.md"');

    await fs.writeFile(path.join(dir, 'b.md'), '---\naliases: [Other]\n---\n\n# B');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    instance.invalidateFile(path.join(dir, 'b.md'));
    const second = await instance.staticSource();
    const secondPage = second.files.find((file) => file.path === 'a.md');
    if (secondPage?.type !== 'page') throw new Error('expected a.md');
    const secondHtml = renderToStaticMarkup((await (await secondPage.data.load()).render()).body);

    expect(second).not.toBe(first);
    expect(secondHtml).not.toContain('href="./b.md"');
    expect(secondHtml).toContain('[[Target]]');
  });

  test('tolerates malformed frontmatter without dropping the vault', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'good.md'), '[[Daily]]');
    await fs.writeFile(path.join(dir, 'bad.md'), '---\ntitle: 2024\naliases: Daily\n---\n\n# Bad');

    const source = await obsidian({ dir }).staticSource();
    const pages = source.files.filter((file) => file.type === 'page');
    const bad = pages.find((file) => file.path === 'bad.md');
    const good = pages.find((file) => file.path === 'good.md');
    if (good?.type !== 'page') throw new Error('expected good.md');

    // scalar titles are coerced, string aliases are treated as a single-item list
    expect(bad?.data.title).toBe('2024');
    const html = renderToStaticMarkup((await (await good.data.load()).render()).body);
    expect(html).toContain('href="./bad.md"');
  });

  test('keeps malformed percent-encoded hrefs untouched', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'other.md'), '# Other');
    await fs.writeFile(path.join(dir, 'page.md'), 'see [broken](50%zz) and [fine](other.md)');

    const source = await obsidian({ dir }).staticSource();
    const page = source.files.find((file) => file.path === 'page.md');
    if (page?.type !== 'page') throw new Error('expected page.md');

    const html = renderToStaticMarkup((await (await page.data.load()).render()).body);
    expect(html).toContain('broken');
    expect(html).toContain('href="./other.md"');
  });

  test('injects image sizes for Next.js Image', async () => {
    const dir = await createTempDir();
    // a 1x1 PNG
    await fs.writeFile(
      path.join(dir, 'img.png'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    );
    await fs.writeFile(path.join(dir, 'page.md'), '![[img.png]]');

    const source = await obsidian({
      dir,
      remarkImageOptions: { publicDir: dir },
    }).staticSource();
    const page = source.files.find((file) => file.path === 'page.md');
    if (page?.type !== 'page') throw new Error('expected page.md');

    const html = renderToStaticMarkup((await (await page.data.load()).render()).body);
    expect(html).toContain('src="/img.png"');
    expect(html).toContain('width="1"');
    expect(html).toContain('height="1"');
  });

  test('resolves ambiguous names like Obsidian', async () => {
    const dir = await createTempDir();
    await fs.mkdir(path.join(dir, 'sub'), { recursive: true });
    await fs.writeFile(path.join(dir, 'note.md'), '# Root');
    await fs.writeFile(path.join(dir, 'sub', 'note.md'), '# Nested');
    // an attachment sharing the name of a note
    await fs.writeFile(path.join(dir, 'pic.png'), 'not a real image');
    await fs.writeFile(path.join(dir, 'pic.md'), '# Pic Note');
    await fs.writeFile(path.join(dir, 'page.md'), '[[note]] [[pic]]');

    const source = await obsidian({ dir }).staticSource();
    const page = source.files.find((file) => file.path === 'page.md');
    if (page?.type !== 'page') throw new Error('expected page.md');

    const html = renderToStaticMarkup((await (await page.data.load()).render()).body);
    // shortest path wins, notes win over attachments
    expect(html).toContain('href="./note.md"');
    expect(html).toContain('href="./pic.md"');
  });

  test('renders unknown code fence languages as plain text', async () => {
    const dir = await createTempDir();
    await fs.writeFile(
      path.join(dir, 'page.md'),
      '```dataview\nLIST FROM #tag\n```\n\n```ts\nconsole.log(1);\n```\n',
    );

    const source = await obsidian({ dir }).staticSource();
    const page = source.files.find((file) => file.path === 'page.md');
    if (page?.type !== 'page') throw new Error('expected page.md');

    const html = renderToStaticMarkup((await (await page.data.load()).render()).body);
    expect(html).toContain('LIST FROM #tag');
    expect(html).toContain('console');
  });

  test('never reads media files into memory', async () => {
    const mediaFiles: unknown[] = [];
    await obsidian({
      dir: fixturesDir,
      url: (vaultPath, mediaFile) => {
        mediaFiles.push(mediaFile);
        return `/vault/${vaultPath}`;
      },
    }).staticSource();

    expect(mediaFiles.length).toBeGreaterThan(0);
    for (const file of mediaFiles) {
      expect(file).not.toHaveProperty('content');
    }
  });

  test('picks up added and removed files after invalidation', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'a.md'), '[[b]]');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const instance = obsidian({ dir });

    const first = await instance.staticSource();
    expect(first.files.some((file) => file.path === 'b.md')).toBe(false);

    const added = path.join(dir, 'b.md');
    await fs.writeFile(added, '# B');
    instance.invalidateFile(added);
    const second = await instance.staticSource();
    const page = second.files.find((file) => file.path === 'a.md');
    if (page?.type !== 'page') throw new Error('expected a.md');

    expect(second.files.some((file) => file.path === 'b.md')).toBe(true);
    const html = renderToStaticMarkup((await (await page.data.load()).render()).body);
    expect(html).toContain('href="./b.md"');

    await fs.rm(added);
    instance.invalidateFile(added);
    const third = await instance.staticSource();
    expect(third.files.some((file) => file.path === 'b.md')).toBe(false);
  });

  test('notifies dynamic loaders after invalidation', async () => {
    const instance = obsidian({ dir: fixturesDir });
    const dynamic = instance.dynamicSource();
    let invalidated = 0;
    dynamic.configure?.({ invalidate: () => void invalidated++ } as never);

    await dynamic.files();
    instance.invalidateFile(path.join(fixturesDir, 'Welcome.md'));

    expect(invalidated).toBe(1);
  });
});

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-source-'));
  tempDirs.push(dir);
  return dir;
}
