import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { structure, type StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { DynamicSource, MetaData, PageData, VirtualFile } from 'fumadocs-core/source';

const API_URL = 'https://www.googleapis.com/drive/v3';
const FOLDER_TYPE = 'application/vnd.google-apps.folder';
const DOCUMENT_TYPE = 'application/vnd.google-apps.document';
const FILE_FIELDS = 'id,name,mimeType,version,modifiedTime,description,webViewLink';
const MARKDOWN_EXT = /\.md$/i;
// Google Docs embed images as base64, they are irrelevant to search
const BASE64_URI = /data:[\w/+.-]+;base64,[\w+/=]+/g;
const CONCURRENCY = 16;
/** Indexing all pages for search must not block loading pages. */
const INDEX_CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;
/** Maximum characters of loaded pages to keep in memory. */
const CACHE_SIZE = 16 * 1024 * 1024;

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  /** Increases on every change to the file. */
  version: string;
  modifiedTime: string;
  description?: string;
  webViewLink?: string;
}

export interface GoogleDrivePageLoaded {
  /** Markdown content, without frontmatter. */
  content: string;
  /** Frontmatter of Markdown files, empty for Google Docs. */
  frontmatter: Record<string, unknown>;
}

export interface GoogleDrivePageData extends PageData {
  title: string;
  description?: string;
  file: GoogleDriveFile;
  load: () => Promise<GoogleDrivePageLoaded>;
  structuredData: () => Promise<StructuredData>;
}

export interface CreateGoogleDriveOptions {
  /** Get an OAuth 2.0 access token with a Drive read scope, called before every request. */
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
}

export interface GoogleDriveSourceOptions {
  /** ID of the folder to publish. */
  folderId: string;
  /** Base directory for generated virtual file paths. */
  baseDir?: string;
  /**
   * Once the result is older than this duration (ms), crawl the folder again in the background while serving the previous result.
   * By default, the result is cached until the loader is invalidated.
   */
  staleTime?: number;
}

type SourceConfig = { pageData: GoogleDrivePageData; metaData: MetaData };
type DriveVirtualFile = VirtualFile<SourceConfig>;

export interface GoogleDriveIntegration {
  $inferPage: GoogleDrivePageData;
  dynamicSource: (options: GoogleDriveSourceOptions) => DynamicSource<SourceConfig>;
}

interface Folder {
  id: string;
  name: string;
  mimeType: string;
  driveId?: string;
}

interface FileList {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export function createGoogleDrive({
  getAccessToken,
}: CreateGoogleDriveOptions): GoogleDriveIntegration {
  const limit = createLimiter(CONCURRENCY);
  const indexLimit = createLimiter(INDEX_CONCURRENCY);
  // loaded pages by file version, in least recently used order
  const pageCache = new Map<string, { value: Promise<GoogleDrivePageLoaded>; size: number }>();
  let pageCacheSize = 0;

  function request(path: string, params: Record<string, string>): Promise<string> {
    const url = `${API_URL}/${path}?${new URLSearchParams(params)}`;

    return limit(async () => {
      for (let attempt = 1; ; attempt++) {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('[@fumadocs/google-drive] `getAccessToken()` returned no token.');
        }

        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.text();
        if (response.ok) return body;

        if (attempt < MAX_ATTEMPTS && isRetryable(response.status, body)) {
          await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
          continue;
        }

        throw new Error(
          `[@fumadocs/google-drive] Request to ${path} failed with ${response.status}: ${getErrorMessage(body)}`,
        );
      }
    });
  }

  function download(file: GoogleDriveFile): Promise<string> {
    return request(`files/${file.id}`, { alt: 'media', supportsAllDrives: 'true' });
  }

  async function listFolder(folderId: string, driveId?: string): Promise<GoogleDriveFile[]> {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    };
    if (driveId) {
      params.corpora = 'drive';
      params.driveId = driveId;
    }

    const files: GoogleDriveFile[] = [];
    while (true) {
      const result: FileList = JSON.parse(await request('files', params));
      for (const file of result.files) files.push(file);
      if (!result.nextPageToken) return files;
      params.pageToken = result.nextPageToken;
    }
  }

  async function loadMeta(file: GoogleDriveFile, path: string): Promise<MetaData> {
    const content = await download(file);
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`[@fumadocs/google-drive] Failed to parse ${path}`, { cause: error });
    }
  }

  async function fetchPage(file: GoogleDriveFile): Promise<GoogleDrivePageLoaded> {
    if (file.mimeType === DOCUMENT_TYPE) {
      return {
        content: await request(`files/${file.id}/export`, { mimeType: 'text/markdown' }),
        frontmatter: {},
      };
    }

    const { content, data } = frontmatter(await download(file));
    return { content, frontmatter: data as Record<string, unknown> };
  }

  function loadPage(file: GoogleDriveFile): Promise<GoogleDrivePageLoaded> {
    const key = `${file.id}:${file.version}`;
    const cached = pageCache.get(key);
    if (cached) {
      pageCache.delete(key);
      pageCache.set(key, cached);
      return cached.value;
    }

    const entry = { value: fetchPage(file), size: 0 };
    pageCache.set(key, entry);
    entry.value.then(
      ({ content }) => {
        if (pageCache.get(key) !== entry) return;
        entry.size = content.length;
        pageCacheSize += entry.size;
        for (const [k, item] of pageCache) {
          if (pageCacheSize <= CACHE_SIZE) break;
          pageCache.delete(k);
          pageCacheSize -= item.size;
        }
      },
      () => {
        if (pageCache.get(key) === entry) pageCache.delete(key);
      },
    );
    return entry.value;
  }

  function createPage(file: GoogleDriveFile, path: string, title: string): DriveVirtualFile {
    const load = () => loadPage(file);
    let structuredData: Promise<StructuredData> | undefined;

    return {
      type: 'page',
      path,
      data: {
        title,
        description: file.description,
        file,
        load,
        structuredData() {
          return (structuredData ??= indexLimit(load)
            .then(({ content }) => structure(content.replaceAll(BASE64_URI, '')))
            .catch((error: unknown) => {
              structuredData = undefined;
              throw error;
            }));
        },
      },
    };
  }

  /** Unchanged files keep their objects from `previous`, so the loader and search index are not rebuilt. */
  async function crawl(folderId: string, previous: Map<string, DriveVirtualFile>) {
    const root: Folder = JSON.parse(
      await request(`files/${encodeURIComponent(folderId)}`, {
        fields: 'id,name,mimeType,driveId',
        supportsAllDrives: 'true',
      }),
    );
    if (root.mimeType !== FOLDER_TYPE) {
      throw new Error(`[@fumadocs/google-drive] "${root.name}" (${root.id}) is not a folder.`);
    }

    const files: DriveVirtualFile[] = [];
    const cache = new Map<string, DriveVirtualFile>();
    const owners = new Map<string, string>();

    function add(key: string, file: DriveVirtualFile) {
      cache.set(key, file);
      files.push(file);
    }

    function claim(path: string, name: string): string {
      const owner = owners.get(path);
      if (owner !== undefined) {
        throw new Error(
          `[@fumadocs/google-drive] "${owner}" and "${name}" resolve to the same path: ${path}`,
        );
      }
      owners.set(path, name);
      return path;
    }

    async function scan(folder: { id: string; name: string }, dir: string): Promise<void> {
      const folders: [folder: GoogleDriveFile, dir: string][] = [];
      const pages: GoogleDriveFile[] = [];
      let metaFile: GoogleDriveFile | undefined;

      for (const file of await listFolder(folder.id, root.driveId)) {
        if (file.mimeType === FOLDER_TYPE) {
          folders.push([file, claim(joinPath(dir, slugify(file.name) || file.id), file.name)]);
        } else if (file.name === 'meta.json') {
          metaFile = file;
        } else if (file.mimeType === DOCUMENT_TYPE || MARKDOWN_EXT.test(file.name)) {
          pages.push(file);
        }
      }

      async function addFiles() {
        const metaPath = joinPath(dir, 'meta.json');
        const metaKey = `${folder.id}:${metaPath}:${metaFile?.id}:${metaFile?.version}:${folder.name}`;
        let meta = previous.get(metaKey);
        if (!meta) {
          const data: MetaData = metaFile ? await loadMeta(metaFile, metaPath) : {};
          if (dir) data.title ??= folder.name;
          meta = { type: 'meta', path: metaPath, data };
        }
        if (dir || metaFile) add(metaKey, meta);
        const folderTitle = meta.data.title ?? folder.name;

        for (const file of pages) {
          const name = file.name.replace(MARKDOWN_EXT, '');
          const slug = slugify(name) || file.id;
          const path = claim(joinPath(dir, `${slug}.md`), file.name);
          // index pages are landing pages, titled after their folder
          const title = slug === 'index' ? folderTitle : name;
          const key = `${file.id}:${file.version}:${path}:${title}`;
          add(key, previous.get(key) ?? createPage(file, path, title));
        }
      }

      const tasks = [addFiles()];
      for (const [child, childDir] of folders) tasks.push(scan(child, childDir));
      await Promise.all(tasks);
    }

    await scan(root, '');
    files.sort((a, b) => (a.path < b.path ? -1 : 1));
    return { files, cache };
  }

  return {
    $inferPage: undefined as never,
    dynamicSource({ folderId, baseDir, staleTime }) {
      let previous = new Map<string, DriveVirtualFile>();
      let current: DriveVirtualFile[] | undefined;
      let pending: Promise<DriveVirtualFile[]> | undefined;
      let checkedAt = 0;

      function refresh(): Promise<DriveVirtualFile[]> {
        checkedAt = Date.now();
        const promise: Promise<DriveVirtualFile[]> = crawl(folderId, previous)
          .then((result) => {
            if (pending === promise) {
              previous = result.cache;
              current = result.files;
            }
            return result.files;
          })
          .finally(() => {
            if (pending === promise) pending = undefined;
          });
        return (pending = promise);
      }

      return {
        cache: 'custom',
        baseDir,
        files() {
          if (!current) return pending ?? refresh();
          if (!pending && staleTime !== undefined && Date.now() - checkedAt >= staleTime) {
            refresh().catch((error: unknown) => {
              console.error('[@fumadocs/google-drive] Failed to refresh the folder.', error);
            });
          }
          return current;
        },
        invalidate() {
          current = undefined;
          pending = undefined;
        },
      };
    },
  };
}

function isRetryable(status: number, body: string): boolean {
  return status === 429 || status >= 500 || (status === 403 && /rateLimitExceeded/i.test(body));
}

function getErrorMessage(body: string): string {
  try {
    return JSON.parse(body).error.message;
  } catch {
    return body;
  }
}

function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active < limit) active++;
    else await new Promise<void>((resolve) => queue.push(resolve));

    try {
      return await task();
    } finally {
      // hand the slot over to the next task directly
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, '-')
    .replaceAll(/^-|-$/g, '');
}

function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}
