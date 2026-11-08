import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { LoaderContext } from 'astro/loaders';
import { expect, it, vi } from 'vitest';

const files = ['plain.mdx', 'say-"hi".mdx', 'back\\slash.mdx'];
const config = vi.hoisted(() => ({ loaders: {} as Record<string, object>, root: '/' }));
vi.mock('virtual:fumadocs/config', () => config);
// the files of the collection, as `glob()` loads them
vi.mock('astro/loaders', () => ({
  glob: () => ({
    name: 'glob',
    load: async ({ store }: LoaderContext) => {
      for (const id of files) store.set({ id, data: {} });
    },
  }),
}));

it.skipIf(process.platform === 'win32')(
  'dates the pages of every file name, also ones git quotes',
  async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'fumadocs-astro-'));
    for (const file of files) writeFileSync(path.join(dir, file), '# Page');
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir });
    git('init', '-q');
    git('add', '.');
    git('-c', 'user.name=a', '-c', 'user.email=a@example.com', 'commit', '-qm', 'init');
    config.loaders.docs = { dir, lastModified: true };
    const { pageLoader } = await import('@/loaders');

    const dates = new Map<string, unknown>();
    await pageLoader().load({
      store: {
        set: ({ id, data }: { id: string; data: { lastModified?: Date } }) =>
          dates.set(id, data.lastModified),
        keys: () => [],
        values: () => [],
      },
      generateDigest: String,
    } as unknown as LoaderContext);

    for (const file of files) expect(dates.get(file)).toBeInstanceOf(Date);
  },
);
