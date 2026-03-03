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

export const filesCache = new Map<string, RawPage | RawMeta>();

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

export async function getPages(config: ContentConfig): Promise<{
  pages: RawPage[];
  metas: RawMeta[];
}> {
  async function project(project: NormalizedProjectConfig) {
    const files = await glob(project.include, {
      cwd: project.dir,
    });

    return await Promise.all(
      files.map(async (file) => {
        const absolutePath = path.resolve(project.dir, file);
        const cached = filesCache.get(absolutePath);
        if (cached) return cached;

        const ext = path.extname(file);

        try {
          let out: RawMeta | RawPage | undefined;
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
      }),
    );
  }

  const projects = normalizeProjects(config.projects);
  const all = (await Promise.all(projects.map(project))).flat();

  return {
    metas: all.filter((item) => item?.type === 'meta'),
    pages: all.filter((item) => item?.type === 'page'),
  };
}
