import { expect, test, vi } from 'vitest';
import { dynamicLoader } from '@/source/dynamic';
import type { DynamicSource, VirtualFile } from '@/source';

vi.mock('react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react')>();
  return {
    ...mod,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

const options = { baseUrl: '/' };

function page(path: string, title: string): VirtualFile {
  return { type: 'page', path, data: { title } };
}

test('dynamicLoader: memory cache calls files() once until invalidate', async () => {
  let calls = 0;
  const source: DynamicSource = {
    files() {
      calls++;
      return [page('index.mdx', 'Home')];
    },
  };

  const dynamic = dynamicLoader(source, options);
  const first = await dynamic.get();
  const second = await dynamic.get();

  expect(calls).toBe(1);
  expect(second).toBe(first);

  dynamic.invalidate();
  const third = await dynamic.get();
  expect(calls).toBe(2);
  expect(third).not.toBe(first);
});

test('dynamicLoader: custom cache reuses the loader when file identities match', async () => {
  const files = [page('index.mdx', 'Home')];
  let calls = 0;
  const source: DynamicSource = {
    cache: 'custom',
    files() {
      calls++;
      return files;
    },
  };

  const dynamic = dynamicLoader(source, options);
  const first = await dynamic.get();
  const second = await dynamic.get();

  expect(calls).toBe(2);
  expect(second).toBe(first);
});

test('dynamicLoader: custom cache rebuilds when file identities change', async () => {
  const source: DynamicSource = {
    cache: 'custom',
    files: () => [page('index.mdx', 'Home')],
  };

  const dynamic = dynamicLoader(source, options);
  const first = await dynamic.get();
  const second = await dynamic.get();

  expect(second).not.toBe(first);
});

test('dynamicLoader: configure receives the loader and source name', async () => {
  const configured: { source?: string }[] = [];
  const docs: DynamicSource = {
    files: () => [page('guide.mdx', 'Guide')],
    configure(_loader, opts) {
      configured.push(opts);
    },
  };

  const unnamed = dynamicLoader(docs, options);
  await unnamed.get();
  expect(configured).toEqual([{}]);

  configured.length = 0;
  const named = dynamicLoader({ docs }, options);
  await named.get();
  expect(configured).toEqual([{ source: 'docs' }]);
});

test('dynamicLoader: configureStatic is called for each created static loader', async () => {
  const loaders: unknown[] = [];
  const source: DynamicSource = {
    cache: 'custom',
    files: () => [page('index.mdx', 'Home')],
    configureStatic(opts) {
      loaders.push(opts.loader);
    },
  };

  const dynamic = dynamicLoader(source, options);
  const first = await dynamic.get();
  const second = await dynamic.get();

  expect(loaders).toEqual([first, second]);
});

test('dynamicLoader: configureStatic receives the source name for named sources', async () => {
  let received: string | undefined;
  const docs: DynamicSource = {
    files: () => [page('guide.mdx', 'Guide')],
    configureStatic(opts) {
      received = opts.source;
    },
  };

  await dynamicLoader({ docs }, options).get();
  expect(received).toBe('docs');
});

test('dynamicLoader: invalidate calls source.invalidate', () => {
  const docs = vi.fn();
  const blog = vi.fn();
  const dynamic = dynamicLoader(
    {
      docs: {
        files: () => [page('guide.mdx', 'Guide')],
        invalidate: docs,
      },
      blog: {
        files: () => [page('hello.mdx', 'Hello')],
        invalidate: blog,
      },
    },
    options,
  );

  dynamic.invalidate('docs');
  expect(docs).toHaveBeenCalledOnce();
  expect(blog).not.toHaveBeenCalled();

  dynamic.invalidate();
  expect(docs).toHaveBeenCalledTimes(2);
  expect(blog).toHaveBeenCalledOnce();
});
