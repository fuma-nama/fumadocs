import { afterEach, expect, test, vi } from 'vitest';
import { githubReleases } from '../src/github';

function release(tag: string, data: object = {}) {
  return {
    tag_name: tag,
    name: tag,
    body: `notes of ${tag}`,
    draft: false,
    prerelease: false,
    created_at: '2026-10-09T10:00:00Z',
    published_at: '2026-10-09T10:08:15Z',
    html_url: `https://github.com/fuma-nama/fumadocs/releases/tag/${tag}`,
    ...data,
  };
}

function mockReleases(releases: object[], headers: Record<string, string> = {}) {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json(releases, { headers }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test('releases to entries', async () => {
  const fetch = mockReleases([
    release('@fumadocs/asyncapi@0.4.4'),
    release('cli@16.2.18', { name: 'create-fumadocs-app@16.2.18', prerelease: true }),
    release('v1.0.0', { name: 'Big Release', body: '', published_at: null }),
    release('fumadocs@16.17.2', { draft: true }),
  ]);

  expect(await githubReleases({ owner: 'fuma-nama', repo: 'fumadocs', token: 'secret' })).toEqual({
    entries: [
      {
        id: '@fumadocs/asyncapi@0.4.4',
        title: '@fumadocs/asyncapi@0.4.4',
        date: new Date('2026-10-09T10:08:15Z'),
        versions: [{ name: '@fumadocs/asyncapi', version: '0.4.4' }],
        url: 'https://github.com/fuma-nama/fumadocs/releases/tag/@fumadocs/asyncapi@0.4.4',
        content: 'notes of @fumadocs/asyncapi@0.4.4',
        prerelease: false,
      },
      {
        id: 'cli@16.2.18',
        title: 'create-fumadocs-app@16.2.18',
        date: new Date('2026-10-09T10:08:15Z'),
        versions: [{ name: 'create-fumadocs-app', version: '16.2.18' }],
        url: 'https://github.com/fuma-nama/fumadocs/releases/tag/cli@16.2.18',
        content: 'notes of cli@16.2.18',
        prerelease: true,
      },
      {
        id: 'v1.0.0',
        title: 'Big Release',
        date: new Date('2026-10-09T10:00:00Z'),
        versions: undefined,
        url: 'https://github.com/fuma-nama/fumadocs/releases/tag/v1.0.0',
        content: undefined,
        prerelease: false,
      },
    ],
    nextPage: undefined,
  });

  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('https://api.github.com/repos/fuma-nama/fumadocs/releases?per_page=30&page=1');
  expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret');
});

test('pagination', async () => {
  const fetch = mockReleases([release('a@1.0.1'), release('a@1.0.0')], {
    link: '<https://api.github.com/repositories/1/releases?per_page=2&page=3>; rel="next", <https://api.github.com/repositories/1/releases?per_page=2&page=9>; rel="last"',
  });

  const { nextPage } = await githubReleases({
    owner: 'fuma-nama',
    repo: 'fumadocs',
    page: 2,
    perPage: 2,
  });
  expect(nextPage).toBe(3);
  expect(fetch.mock.calls[0][0]).toBe(
    'https://api.github.com/repos/fuma-nama/fumadocs/releases?per_page=2&page=2',
  );
});

test('pages beyond the results of GitHub', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json({ message: 'Only the first 1000 results are available.' }, { status: 422 }),
  );

  expect(await githubReleases({ owner: 'fuma-nama', repo: 'fumadocs', page: 9999 })).toEqual({
    entries: [],
  });
});
