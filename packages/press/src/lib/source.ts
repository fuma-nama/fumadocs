import { InferPageType, loader, source } from 'fumadocs-core/source';
import { glob } from 'tinyglobby';
import grayMatter from 'gray-matter';
import fs from 'node:fs/promises';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { getConfigRuntime } from '../config/load-runtime';
import path from 'node:path';
import { revalidable } from './revalidable';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import type { ContentConfig, ProjectConfig } from '@/config/global';
import { normalizeProjects } from './source/config';

export interface RawPage {
  type: 'page';
  path: string;
  absolutePath: string;

  data: {
    title: string;
    description?: string;
    content: string;
    frontmatter: Record<string, unknown>;

    project: ProjectConfig;
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

async function getPages(config: ContentConfig): Promise<{
  pages: RawPage[];
  metas: RawMeta[];
}> {
  async function md(project: ProjectConfig, file: string): Promise<RawPage> {
    const absolutePath = path.resolve(project.dir, file);
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

  async function json(project: ProjectConfig, file: string): Promise<RawMeta | undefined> {
    const absolutePath = path.resolve(project.dir, file);
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

  async function project(project: ProjectConfig) {
    const files = await glob(
      project.include ?? ['**/*.{md,mdx}', '**/meta.json', '!node_modules'],
      {
        cwd: project.dir,
      },
    );

    return await Promise.all(
      files.map(async (file) => {
        const ext = path.extname(file);

        try {
          switch (ext) {
            case '.json':
              return await json(project, file);
            case '.mdx':
            case '.md':
              return await md(project, file);
          }
        } catch (e) {
          console.error(`error when parsing ${file}`, e);
        }
      }),
    );
  }

  const projects = normalizeProjects(config.projects ?? [{ dir: '', name: 'root' }]);
  const all = (await Promise.all(projects.map(project))).flat();

  return {
    metas: all.filter((item) => item?.type === 'meta'),
    pages: all.filter((item) => item?.type === 'page'),
  };
}

export const getSource = revalidable({
  async create() {
    const config = await getConfigRuntime();

    return loader({
      source: source(await getPages(config.content ?? {})),
      plugins: [lucideIconsPlugin()],
      baseUrl: '/',
    });
  },
});

export type SourcePage = InferPageType<Awaited<ReturnType<typeof getSource>>>;

export function getPageImage(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return {
    segments,
    url: `/og/${segments.join('/')}`,
  };
}
