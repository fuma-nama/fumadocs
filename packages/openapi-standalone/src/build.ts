import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  loader,
  type MetaData,
  PathUtils,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import { createFromSource } from 'fumadocs-core/search/server';
import type * as PageTree from 'fumadocs-core/page-tree';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { createOpenAPI, type OpenAPIPageData, openapiPlugin } from 'fumadocs-openapi/server';
import type { Document, GeneratedPageProps, ServerObject } from 'fumadocs-openapi';
import type { OverviewPageData, PageData, SiteData } from './app/types';
import type { RenderInput } from './render';
import type { Options } from './index';

/** the client bundle built by Vite */
export const clientDir = new URL('./client/', import.meta.url);
export const assetsPath = '_fumadocs';

export interface SiteBuild {
  /** generated files by their path from the base URL: the site data, documents and search index */
  files: Map<string, string>;
  /** URLs of the pages */
  urls: string[];
  /** origins of the absolute URLs in `servers` of the documents */
  origins: string[];
  renderInput: RenderInput;
}

type OverviewInfo = Omit<OverviewPageData, 'cards'> & { cards?: OverviewPageData['cards'] };

interface OverviewFileData {
  title: string;
  description?: string;
  structuredData: StructuredData;
  overview: OverviewInfo;
}

type SiteConfig = { metaData: MetaData; pageData: OpenAPIPageData | OverviewFileData };
type SiteFile = VirtualFile<SiteConfig>;

export function normalizeBaseUrl(baseUrl = '/'): string {
  let out = '';
  for (const seg of baseUrl.split('/')) if (seg.length > 0) out += `/${seg}`;
  return out;
}

export async function buildSite({
  input,
  per = 'operation',
  groupBy,
  title,
  proxyUrl,
  ...options
}: Options): Promise<SiteBuild> {
  const base = normalizeBaseUrl(options.baseUrl);
  const record = Array.isArray(input) ? Object.fromEntries(input.map((v) => [v, v])) : input;
  const ids = Object.keys(record);
  const names = new Set<string>();

  // documents are identified by names, input IDs can be local paths or URLs with tokens
  async function loadDocument(name: string, raw: string | object) {
    const server = createOpenAPI({ input: { [name]: raw } as Record<string, string | Document> });
    const { bundled } = await server.getSchema(name);
    const dir = ids.length > 1 ? name : '';
    const { files } = await server.staticSource({
      per,
      groupBy: groupBy ?? (hasTags(bundled) ? 'tag' : 'none'),
      meta: true,
      baseDir: dir,
    } as Parameters<typeof server.staticSource>[0]);

    return { name, dir, bundled, files: files as SiteFile[] };
  }

  const documents = await Promise.all(
    ids.map((id) => loadDocument(uniqueName(id, names), record[id])),
  );

  const siteTitle =
    title ??
    (documents.length === 1 ? documents[0].bundled.info?.title : undefined) ??
    'API Reference';
  const files: SiteFile[] = [];
  const origins = new Set<string>();
  for (const { dir, bundled, files: docFiles } of documents) {
    const { info } = bundled;
    const metaPath = PathUtils.joinPath(dir, 'meta.json');
    const indexPath = PathUtils.joinPath(dir, 'index.mdx');
    let meta: MetaData | undefined;
    let hasIndex = false;
    for (const file of docFiles) {
      const filePath = PathUtils.normalize(file.path);
      if (file.type === 'meta' && filePath === metaPath) meta = file.data;
      else if (file.type === 'page' && filePath === indexPath) hasIndex = true;
    }
    if (!meta) docFiles.push({ type: 'meta', path: metaPath, data: (meta = {}) });

    meta.title = dir ? info?.title : siteTitle;
    meta.root = dir.length > 0;
    // a generated page named `index` takes the place of the overview
    if (!hasIndex) {
      meta.pages = ['index', ...(meta.pages ?? [])];
      docFiles.push(
        overviewFile(dir, {
          type: 'overview',
          title: 'Overview',
          heading: info?.title ?? siteTitle,
          description: info?.summary,
          version: info?.version,
          body: info?.description,
        }),
      );
    }

    files.push(...docFiles);
    for (const server of bundled.servers ?? []) addOrigins(origins, server);
  }

  if (documents.length > 1) {
    const cards: OverviewPageData['cards'] = [];
    for (const doc of documents) {
      cards.push({
        title: doc.bundled.info?.title ?? doc.name,
        description: doc.bundled.info?.summary,
        url: `${base}/${doc.name}`,
      });
    }

    files.push(
      { type: 'meta', path: 'meta.json', data: { title: siteTitle, pages: ['index', ...names] } },
      overviewFile('', { type: 'overview', title: 'Overview', heading: siteTitle, cards }),
    );
  }

  const siteSource: Source<SiteConfig> = { files };
  const source = loader(siteSource, { baseUrl: base || '/', plugins: [openapiPlugin()] });
  const tree = source.getPageTree();
  const outFiles = new Map<string, string>();

  function emit(name: string, content: string): string {
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
    const file = `${assetsPath}/${name}-${hash}.json`;
    outFiles.set(file, content);
    return `${base}/${file}`;
  }

  const documentUrls: Record<string, string> = {};
  const documentJSON: Record<string, string> = {};
  for (const doc of documents) {
    documentJSON[doc.name] = JSON.stringify(doc.bundled);
    documentUrls[doc.name] = emit(doc.name, documentJSON[doc.name]);
  }

  // keys are decoded, like the pathnames they are looked up with
  const pages: Record<string, PageData> = {};
  for (const page of source.getPages()) {
    const data = page.data;
    const url = decodeURI(page.url);

    if ('overview' in data) {
      const { cards, ...overview } = data.overview;
      pages[url] = { ...overview, cards: cards ?? getCards(source, tree, page.url) };
      continue;
    }

    const { payload: _payload, ...props } = data.getOpenAPIPageProps();
    pages[url] = {
      type: 'api',
      title: data.title ?? '',
      description: data.description,
      toc: data.toc,
      props: props as GeneratedPageProps,
    };
  }

  const manifest: { file: string; isEntry?: boolean; css?: string[] }[] = Object.values(
    JSON.parse(await readFile(new URL('.vite/manifest.json', clientDir), 'utf8')),
  );
  const entry = manifest.find((chunk) => chunk.isEntry)!;
  const assetUrl = (file: string) => `${base}/${assetsPath}/${file}`;

  const site: SiteData = {
    title: siteTitle,
    url: base || '/',
    tree: await source.serializePageTree(tree),
    pages,
    documents: documentUrls,
    search: emit('search', JSON.stringify(await createFromSource(source).export())),
    styles: (entry.css ?? []).map(assetUrl),
    proxyUrl,
  };
  const siteJSON = JSON.stringify(site);

  return {
    files: outFiles,
    urls: Object.keys(pages),
    origins: Array.from(origins),
    renderInput: {
      site: siteJSON,
      siteUrl: emit('site', siteJSON),
      documents: documentJSON,
      entryUrl: assetUrl(entry.file),
    },
  };
}

function overviewFile(dir: string, overview: OverviewInfo): SiteFile {
  return {
    type: 'page',
    path: PathUtils.joinPath(dir, 'index.mdx'),
    data: {
      title: overview.title,
      description: overview.description,
      structuredData: {
        headings: [],
        contents: overview.description
          ? [{ heading: undefined, content: overview.description }]
          : [],
      },
      overview,
    },
  };
}

/** cards of the pages and folders under the overview page */
function getCards(
  source: { getNodePage: (node: PageTree.Item) => { data: { title?: string } } | undefined },
  tree: PageTree.Root,
  url: string,
): OverviewPageData['cards'] {
  // the overview is the first page of its document's folder
  let nodes = tree.children;
  for (const node of tree.children) {
    if (
      node.type === 'folder' &&
      node.children.some((child) => 'url' in child && child.url === url)
    )
      nodes = node.children;
  }

  const cards: OverviewPageData['cards'] = [];
  for (const node of nodes) {
    if (node.type === 'page' && node.url !== url) {
      cards.push({ title: source.getNodePage(node)?.data.title ?? node.url, url: node.url });
    } else if (node.type === 'folder') {
      const first = findFirstPage(node);
      if (!first) continue;

      cards.push({
        title: String(node.name),
        description: typeof node.description === 'string' ? node.description : undefined,
        url: first.url,
      });
    }
  }
  return cards;
}

function findFirstPage(folder: PageTree.Folder): PageTree.Item | undefined {
  for (const node of folder.children) {
    if (node.type === 'page') return node;
    if (node.type === 'folder') {
      const page = findFirstPage(node);
      if (page) return page;
    }
  }
}

function hasTags({ paths = {} }: Document): boolean {
  for (const pathItem of Object.values(paths)) {
    for (const operation of Object.values(pathItem ?? {})) {
      if ((operation as { tags?: string[] } | null)?.tags?.length) return true;
    }
  }
  return false;
}

function uniqueName(id: string, names: Set<string>): string {
  const base = path.basename(URL.parse(id)?.pathname ?? id, path.extname(id));
  const name = base.replace(/[^\w-]+/g, '-').toLowerCase() || 'api';
  let out = name;
  for (let i = 2; names.has(out); i++) out = `${name}-${i}`;
  names.add(out);
  return out;
}

/** add the origin of a server URL, with each combination of the values of variables it uses */
function addOrigins(origins: Set<string>, { url, variables = {} }: ServerObject) {
  if (!url) return;

  let urls = [url];
  for (const [name, variable] of Object.entries(variables)) {
    if (!url.includes(`{${name}}`)) continue;

    const values = variable.enum?.length ? variable.enum : [variable.default];
    const next: string[] = [];
    for (const item of urls) {
      for (const value of values) next.push(item.replaceAll(`{${name}}`, String(value)));
    }
    urls = next;
  }

  for (const item of urls) {
    const origin = URL.parse(item)?.origin;
    if (origin && origin !== 'null') origins.add(origin);
  }
}
