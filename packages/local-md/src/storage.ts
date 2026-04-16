import fs from 'node:fs/promises';
import { glob } from 'tinyglobby';
import path from 'node:path';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { LocalMarkdownConfig } from '.';
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';

export interface RawPage {
  type: 'page';
  path: string;
  absolutePath: string;

  data: {
    title: string;
    description?: string;
    content: string;
    frontmatter: Record<string, unknown>;
  };
}

export interface RawMeta {
  type: 'meta';
  path: string;
  absolutePath: string;

  data: {
    title?: string;
    description?: string;
  } & Record<string, unknown>;
}

type BuildFileOutput = RawPage | RawMeta | undefined;

const CHUNK_SIZE = 100;
export const filesCache = new Map<string, RawPage | RawMeta>();

async function buildFile(config: LocalMarkdownConfig, file: string): Promise<BuildFileOutput> {
  const absolutePath = path.resolve(config.dir, file);
  const cached = filesCache.get(absolutePath);
  if (cached) return cached;

  const ext = path.extname(file);

  try {
    let out: BuildFileOutput;
    switch (ext) {
      case '.json':
        out = await json(absolutePath, file);
        break;
      case '.mdx':
      case '.md':
        out = await md(absolutePath, file);
        break;
    }

    if (out === undefined) filesCache.delete(absolutePath);
    else filesCache.set(absolutePath, out);

    return out;
  } catch (e) {
    console.error(`error when parsing ${file}`, e);
    filesCache.delete(absolutePath);
  }
}

export async function getPages(config: LocalMarkdownConfig) {
  const files = await glob(config.include, {
    cwd: config.dir,
  });
  const chunks: Promise<BuildFileOutput[]>[] = [];

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const promises: Promise<BuildFileOutput>[] = [];
    const L = Math.min(files.length, i + CHUNK_SIZE);

    for (let j = i; j < L; j++) {
      promises.push(buildFile(config, files[j]!));
    }

    chunks.push(Promise.all(promises));
  }

  const pages: RawPage[] = [];
  const metas: RawMeta[] = [];
  for await (const chunk of chunks) {
    for (const item of chunk) {
      if (!item) continue;
      if (item.type === 'page') pages.push(item);
      else if (item.type === 'meta') metas.push(item);
    }
  }
  return { pages, metas };
}

async function md(absolutePath: string, file: string): Promise<RawPage> {
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = parseFrontmatter(content);

  // use default frontmatter if invalid in Fumadocs' spec
  const { data: frontmatter = {} } = pageSchema.partial().loose().safeParse(parsed.data);

  return {
    type: 'page',
    path: file,
    absolutePath,
    data: {
      title: frontmatter.title ?? path.basename(file, path.extname(file)),
      description: frontmatter.description,
      content: parsed.content,
      frontmatter,
    },
  };
}

async function json(absolutePath: string, file: string): Promise<RawMeta | undefined> {
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content);
  const result = metaSchema.loose().safeParse(parsed);

  // ignore if it is not `meta.json` for Fumadocs
  if (result.error) return;
  return {
    type: 'meta',
    path: file,
    absolutePath,
    data: result.data,
  };
}
