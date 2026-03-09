import type { ContentConfig } from '@/config/global';
import fs from 'node:fs/promises';
import { glob } from 'tinyglobby';
import grayMatter from 'gray-matter';
import path from 'node:path';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { type NormalizedProjectConfig, normalizeProjects } from './config';

export interface RawPage {
  type: 'page';
  path: string;
  absolutePath: string;

  data: {
    title: string;
    description?: string;
    content: string;
    frontmatter: Record<string, unknown>;

    project: NormalizedProjectConfig;
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

export async function getPages(config: ContentConfig): Promise<{
  pages: RawPage[];
  metas: RawMeta[];
}> {
  const projects = normalizeProjects(config.projects);
  return (await Promise.all(projects.map(buildProject))).reduce(
    (a, b) => {
      a.metas.push(...b.metas);
      a.pages.push(...b.pages);
      return a;
    },
    { pages: [], metas: [] },
  );
}

async function buildFile(project: NormalizedProjectConfig, file: string): Promise<BuildFileOutput> {
  const absolutePath = path.resolve(project.dir, file);
  const cached = filesCache.get(absolutePath);
  if (cached) return cached;

  const ext = path.extname(file);

  try {
    let out: BuildFileOutput;
    switch (ext) {
      case '.json':
        out = await json(project, absolutePath, file);
        break;
      case '.mdx':
      case '.md':
        out = await md(project, absolutePath, file);
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

async function buildProject(project: NormalizedProjectConfig) {
  const files = await glob(project.include, {
    cwd: project.dir,
  });
  const chunks: Promise<BuildFileOutput[]>[] = [];

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const promises: Promise<BuildFileOutput>[] = [];
    const L = Math.min(files.length, i + CHUNK_SIZE);

    for (let j = i; j < L; j++) {
      promises.push(buildFile(project, files[j]!));
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

async function md(
  project: NormalizedProjectConfig,
  absolutePath: string,
  file: string,
): Promise<RawPage> {
  const content = (await fs.readFile(absolutePath)).toString();
  const parsed = grayMatter({ content });

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
      project,
    },
  };
}

async function json(
  _project: NormalizedProjectConfig,
  absolutePath: string,
  file: string,
): Promise<RawMeta | undefined> {
  const content = (await fs.readFile(absolutePath)).toString();
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
