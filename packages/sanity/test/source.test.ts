import type { SanityClient } from '@sanity/client';
import { dynamicLoader } from 'fumadocs-core/source';
import type { DefinedFetchType } from 'next-sanity/live';
import { describe, expect, it, vi } from 'vitest';
import { createSanitySource } from '../src';

function doc(id: string, updatedAt: string, title = id) {
  return {
    _id: id,
    _type: 'docs',
    _updatedAt: updatedAt,
    title,
    slug: { _type: 'slug' as const, current: id },
  };
}

function liveFetch(docs: () => unknown[]) {
  const fn = vi.fn(async () => ({ data: docs(), sourceMap: null, tags: [] }));
  return { fn, sanityFetch: fn as unknown as DefinedFetchType };
}

describe('createSanitySource', () => {
  it('relies on the loader memory cache with a plain client', () => {
    const client = { fetch: vi.fn() } as unknown as SanityClient;
    const source = createSanitySource({ client, docType: 'docs' });

    expect(source.cache).toBe('memory');
  });

  it('re-reads `sanityFetch` on every call and keeps unchanged documents by identity', async () => {
    let docs = [doc('a', '1'), doc('b', '1')];
    const { fn, sanityFetch } = liveFetch(() => docs);
    const source = createSanitySource({ sanityFetch, docType: 'docs' });
    expect(source.cache).toBe('custom');

    const first = await source.files();
    const second = await source.files();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(second[0]).toBe(first[0]);
    expect(second[1]).toBe(first[1]);

    docs = [doc('a', '1'), doc('b', '2', 'B edited')];
    const third = await source.files();
    expect(third[0]).toBe(first[0]);
    expect(third[1]).not.toBe(first[1]);
    expect(third[1].data.title).toBe('B edited');
  });

  it('drops reused files on invalidate()', async () => {
    const { sanityFetch } = liveFetch(() => [doc('a', '1')]);
    const source = createSanitySource({ sanityFetch, docType: 'docs' });

    const [before] = await source.files();
    source.invalidate?.();
    const [after] = await source.files();
    expect(after).not.toBe(before);
  });

  it('only rebuilds the dynamic loader when documents change', async () => {
    let docs = [doc('a', '1')];
    const { sanityFetch } = liveFetch(() => docs);
    const loader = dynamicLoader(createSanitySource({ sanityFetch, docType: 'docs' }), {
      baseUrl: '/docs',
    });

    const initial = await loader.get();
    expect(await loader.get()).toBe(initial);
    expect(initial.getPage(['a'])?.data._updatedAt).toBe('1');

    docs = [doc('a', '2')];
    const updated = await loader.get();
    expect(updated).not.toBe(initial);
    expect(updated.getPage(['a'])?.data._updatedAt).toBe('2');
  });
});
