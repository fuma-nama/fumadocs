import { dynamicLoader } from 'fumadocs-core/source';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoogleDrive,
  type GoogleDriveIntegration,
  type GoogleDrivePageData,
} from '../src/index';

const FOLDER = 'application/vnd.google-apps.folder';
const DOCUMENT = 'application/vnd.google-apps.document';

interface Item {
  file: Record<string, string>;
  parent?: string;
  content?: string;
}

function item(id: string, name: string, mimeType: string, parent?: string, content?: string): Item {
  const file = { id, name, mimeType, version: '1', modifiedTime: '2026-09-29T00:00:00Z' };
  return { file, parent, content };
}

const folder = (id: string, name: string, parent?: string) => item(id, name, FOLDER, parent);
const doc = (id: string, name: string, parent: string, content: string) =>
  item(id, name, DOCUMENT, parent, content);
const file = (id: string, name: string, parent: string, content: string, type = 'text/markdown') =>
  item(id, name, type, parent, content);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}

/** A fake Drive API that returns two files per page. */
function mockDrive(items: Item[]) {
  const fetchMock = vi.fn(async (input: string, _init: RequestInit) => {
    const url = new URL(input);
    const [, id, exported] = /^\/drive\/v3\/files(?:\/([^/]+))?(\/export)?$/.exec(url.pathname)!;

    if (!id) {
      const parent = /^'(.+?)' in parents/.exec(url.searchParams.get('q')!)![1];
      const children = items.filter((v) => v.parent === parent);
      const offset = Number(url.searchParams.get('pageToken') ?? 0);

      return json({
        files: children.slice(offset, offset + 2).map((v) => v.file),
        nextPageToken: offset + 2 < children.length ? String(offset + 2) : undefined,
      });
    }

    const target = items.find((v) => v.file.id === id);
    if (!target) return json({ error: { message: `File not found: ${id}.` } }, 404);
    if (exported) {
      expect(url.searchParams.get('mimeType')).toBe('text/markdown');
      return new Response(target.content);
    }
    if (url.searchParams.get('alt') === 'media') return new Response(target.content);
    return json(target.file);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

let drive: GoogleDriveIntegration;

beforeEach(() => {
  drive = createGoogleDrive({ getAccessToken: () => 'token' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('createGoogleDrive', () => {
  it('maps folders, Google Docs, and Markdown files', async () => {
    const fetchMock = mockDrive([
      folder('root', 'Docs'),
      doc('home', 'Index', 'root', '# Welcome'),
      folder('guides', 'Getting Started', 'root'),
      doc('install', 'Installation', 'guides', '# Install'),
      file('config', 'Configuration.md', 'guides', '---\ntitle: Config\n---\n# Configure'),
      file(
        'meta',
        'meta.json',
        'guides',
        '{"pages":["installation","configuration"]}',
        'application/json',
      ),
      file('spec', 'Spec.pdf', 'guides', '', 'application/pdf'),
    ]);

    const source = await dynamicLoader(drive.dynamicSource({ folderId: 'root' }), {
      baseUrl: '/docs',
    }).get();

    expect(source.getPages().map((page) => [page.url, page.data.title])).toEqual([
      ['/docs/getting-started/configuration', 'Configuration'],
      ['/docs/getting-started/installation', 'Installation'],
      ['/docs', 'Docs'],
    ]);
    expect(source.getPageTree().children).toMatchObject([
      { type: 'page', name: 'Docs' },
      {
        type: 'folder',
        name: 'Getting Started',
        children: [{ name: 'Installation' }, { name: 'Configuration' }],
      },
    ]);

    expect(await source.getPage(['getting-started', 'installation'])!.data.load()).toEqual({
      content: '# Install',
      frontmatter: {},
    });
    expect(await source.getPage(['getting-started', 'configuration'])!.data.load()).toEqual({
      content: '# Configure',
      frontmatter: { title: 'Config' },
    });
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer token' } });
  });

  it('generates structured data with the heading IDs of rendered Markdown', async () => {
    mockDrive([
      folder('root', 'Docs'),
      doc(
        'page',
        'Page',
        'root',
        '# Setup\n\n```bash\n# comment\n```\n\n## API: v2.0\n\nUse it.\n\n![diagram](data:image/png;base64,iVBORw0KGgo=)',
      ),
    ]);

    const [page] = await drive.dynamicSource({ folderId: 'root' }).files();
    if (page.type !== 'page') throw new Error('expected a page');

    expect(await page.data.structuredData()).toEqual({
      headings: [
        { id: 'setup', content: 'Setup' },
        { id: 'api-v20', content: 'API: v2.0' },
      ],
      contents: [{ heading: 'api-v20', content: 'Use it.' }],
    });
  });

  it('reuses unchanged files and their content across crawls', async () => {
    const items = [
      folder('root', 'Docs'),
      folder('guides', 'Guides', 'root'),
      doc('a', 'A', 'guides', '# A'),
      doc('b', 'B', 'guides', '# B'),
    ];
    const fetchMock = mockDrive(items);
    const loader = dynamicLoader(drive.dynamicSource({ folderId: 'root' }), { baseUrl: '/docs' });

    const first = await loader.get();
    const page = first.getPage(['guides', 'a'])!;
    await page.data.load();
    await page.data.structuredData();
    await loader.revalidate();
    expect(await loader.get()).toBe(first);

    items[3].file.version = '2';
    items[3].content = '# B2';
    await loader.revalidate();
    const second = await loader.get();
    expect(second).not.toBe(first);
    expect(second.getPage(['guides', 'a'])!.data).toBe(page.data);
    expect((await second.getPage(['guides', 'b'])!.data.load()).content).toBe('# B2');

    fetchMock.mockClear();
    await page.data.load();
    await page.data.structuredData();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves the previous result while crawling in the background', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const items = [folder('root', 'Docs'), doc('a', 'A', 'root', '# A')];
    const fetchMock = mockDrive(items);
    const loader = dynamicLoader(drive.dynamicSource({ folderId: 'root', staleTime: 1000 }), {
      baseUrl: '/docs',
    });
    const first = await loader.get();

    fetchMock.mockImplementationOnce(async () => json({ error: { message: 'Forbidden' } }, 403));
    vi.advanceTimersByTime(1000);
    expect(await loader.get()).toBe(first);
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
    expect(await loader.get()).toBe(first);

    items[1].file.version = '2';
    vi.advanceTimersByTime(1000);
    expect(await loader.get()).toBe(first);
    await vi.waitFor(async () => {
      expect((await loader.get()).getPage(['a'])!.data.file.version).toBe('2');
    });
  });

  it('evicts the least recently used pages from the cache', async () => {
    const content = 'x'.repeat(10 * 1024 * 1024);
    const fetchMock = mockDrive([
      folder('root', 'Docs'),
      doc('a', 'A', 'root', content),
      doc('b', 'B', 'root', content),
    ]);
    const [a, b] = await drive.dynamicSource({ folderId: 'root' }).files();
    if (a.type !== 'page' || b.type !== 'page') throw new Error('expected pages');

    await a.data.load();
    await b.data.load();
    fetchMock.mockClear();
    await b.data.load();
    expect(fetchMock).not.toHaveBeenCalled();
    await a.data.load();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('lists shared drive folders from the drive corpus', async () => {
    const root = folder('root', 'Docs');
    root.file.driveId = 'shared';
    const fetchMock = mockDrive([root, doc('a', 'A', 'root', '# A')]);

    await drive.dynamicSource({ folderId: 'root' }).files();

    const list = new URL(fetchMock.mock.calls[1][0]);
    expect(list.searchParams.get('corpora')).toBe('drive');
    expect(list.searchParams.get('driveId')).toBe('shared');
  });

  it('rejects files that resolve to the same path', async () => {
    mockDrive([
      folder('root', 'Docs'),
      doc('a', 'Setup', 'root', ''),
      file('b', 'setup.md', 'root', ''),
    ]);

    await expect(drive.dynamicSource({ folderId: 'root' }).files()).rejects.toThrow(
      '"Setup" and "setup.md" resolve to the same path: setup.md',
    );
  });

  it('retries rate-limited requests and does not cache failures', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const fetchMock = mockDrive([folder('root', 'Docs'), doc('a', 'A', 'root', '# A')]);
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Rate Limit Exceeded' } }, 429));

    const files = drive.dynamicSource({ folderId: 'root' }).files();
    await vi.runAllTimersAsync();
    const [page] = await files;
    if (page.type !== 'page') throw new Error('expected a page');

    for (let i = 0; i < 3; i++) {
      fetchMock.mockImplementationOnce(async () =>
        json({ error: { message: 'Backend Error' } }, 500),
      );
    }
    const failed = expect(page.data.structuredData()).rejects.toThrow(
      'failed with 500: Backend Error',
    );
    await vi.runAllTimersAsync();
    await failed;

    expect((await page.data.structuredData()).headings).toEqual([{ id: 'a', content: 'A' }]);
  });

  it('limits concurrent requests, leaving room for pages while indexing', async () => {
    const items = [folder('root', 'Docs')];
    for (let i = 0; i < 40; i++) items.push(doc(`d${i}`, `Doc ${i}`, 'root', `# ${i}`));
    const fetchMock = mockDrive(items);
    const pages: GoogleDrivePageData[] = [];
    for (const file of await drive.dynamicSource({ folderId: 'root' }).files()) {
      if (file.type === 'page') pages.push(file.data);
    }

    const respond = fetchMock.getMockImplementation()!;
    let active = 0;
    let maxActive = 0;
    fetchMock.mockImplementation(async (...args) => {
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return respond(...args);
    });

    await Promise.all(pages.slice(0, 20).map((page) => page.load()));
    expect(maxActive).toBe(16);

    maxActive = 0;
    await Promise.all(pages.slice(20).map((page) => page.structuredData()));
    expect(maxActive).toBe(8);
  });

  it('requires an access token', async () => {
    mockDrive([folder('root', 'Docs')]);
    const source = createGoogleDrive({ getAccessToken: () => undefined }).dynamicSource({
      folderId: 'root',
    });

    await expect(source.files()).rejects.toThrow('`getAccessToken()` returned no token');
  });
});
