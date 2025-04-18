import type { OutputFile } from './convert';
import * as fs from 'node:fs/promises';
import { dump } from 'js-yaml';
import * as path from 'node:path';

interface WriteOptions {
  outDir?: string;
}

export async function write(output: OutputFile[], options: WriteOptions = {}) {
  await Promise.all(
    output.map(async (file) => {
      const filePath = path.resolve(
        options.outDir ?? './',
        file.path.split('/').slice(1).join('/'),
      );
      console.log('write', filePath);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        Object.keys(file.frontmatter).length > 0
          ? `${frontmatter(file.frontmatter)}\n\n${file.content}`
          : file.content,
      );
    }),
  );
}

export function frontmatter(obj: unknown) {
  return `---\n${dump(obj).trim()}\n---`;
}
