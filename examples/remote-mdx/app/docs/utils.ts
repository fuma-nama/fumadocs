import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import FastGlob from 'fast-glob';

export interface Frontmatter {
  title: string;
  description?: string;
}

/**
 * Get Page content
 */
export async function getPage(slugs: string[] = []): Promise<
  | {
      path: string;
      content: string;
    }
  | undefined
> {
  try {
    let file = path.join('content', 'docs', ...slugs);

    const stats = await fs.stat(file).catch(() => null);

    if (stats && stats.isDirectory()) {
      file = path.join(file, 'index.mdx');
    } else {
      file = file + '.mdx';
    }

    return {
      path: file,
      content: (await fs.readFile(file)).toString(),
    };
  } catch {
    return undefined;
  }
}

interface Page {
  slug: string[];
  path: string;
}

export async function getPages(): Promise<Page[]> {
  const files = await FastGlob('content/docs/**/*.mdx');

  return files.map((file) => {
    const slugs = file.split(path.sep).filter(Boolean).slice(2);
    const last = slugs[slugs.length - 1];

    slugs[slugs.length - 1] = last.slice(0, -path.extname(last).length);
    if (slugs[slugs.length - 1] === 'index') slugs.pop();

    return {
      path: file,
      slug: slugs,
    };
  });
}
