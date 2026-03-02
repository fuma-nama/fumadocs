import { InferPageType, loader, source } from 'fumadocs-core/source';
import { glob } from 'tinyglobby';
import grayMatter from 'gray-matter';
import fs from 'node:fs/promises';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { loadConfig } from './get-config';
import path from 'node:path';

export interface ContentConfig {
  include?: string[];
}

export interface RawPage {
  type: 'page';
  path: string;
  absolutePath: string;

  data: {
    title?: string;
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

async function getPages(config: ContentConfig): Promise<{
  pages: RawPage[];
  metas: RawMeta[];
}> {
  const include = config.include ?? ['**/*.{md,mdx,json}', '!node_modules'];

  async function md(file: string): Promise<RawPage> {
    const content = (await fs.readFile(file)).toString();
    const parsed = grayMatter({ content });

    const dataResult = pageSchema.partial().loose().safeParse(parsed.data);
    if (dataResult.error) {
      throw dataResult.error;
    }

    return {
      type: 'page',
      path: file,
      absolutePath: path.resolve(file),
      data: {
        title: dataResult.data.title,
        description: dataResult.data.description,
        content,
        frontmatter: dataResult.data,
      },
    };
  }

  async function json(file: string): Promise<RawMeta> {
    const content = (await fs.readFile(file)).toString();
    const parsed = JSON.parse(content);
    const result = metaSchema.loose().safeParse(parsed);
    if (result.error) throw result.error;
    return {
      type: 'meta',
      path: file,
      absolutePath: path.resolve(file),
      data: result.data,
    };
  }

  const files = await glob(include);
  const all = await Promise.all(
    files.map(async (file) => {
      const ext = path.extname(file);

      try {
        switch (ext) {
          case '.json':
            return await json(file);
          case '.mdx':
          case '.md':
            return await md(file);
        }
      } catch (e) {
        console.error(`error when parsing ${file}`, e);
      }
    }),
  );

  return {
    metas: all.filter((item) => item?.type === 'meta'),
    pages: all.filter((item) => item?.type === 'page'),
  };
}

export async function getSource() {
  const config = await loadConfig();

  return loader({
    source: source(await getPages(config.content ?? {})),
    baseUrl: '/',
  });
}

export type SourcePage = InferPageType<Awaited<ReturnType<typeof getSource>>>;
