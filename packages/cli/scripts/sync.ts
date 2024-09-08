import * as fs from 'node:fs/promises';
import path from 'node:path';

export const templates = {
  'lib/metadata': './examples/next-mdx/lib/metadata.ts',
  'app/docs-og/[...slug]/route':
    './examples/next-mdx/app/docs-og/[...slug]/route.tsx',

  'lib/i18n': './examples/i18n/lib/i18n.ts',
  middleware: './examples/i18n/middleware.ts',
};

export const examples = {
  'fumadocs-mdx': './examples/next-mdx',
};

export async function sync(): Promise<void> {
  const generated: Record<string, string> = {};

  const resolve = Object.entries(templates).map(async ([name, file]) => {
    generated[name] = await fs
      .readFile(
        // from root dir
        path.resolve('../../', file),
      )
      .then((v) => v.toString());
  });

  await Promise.all(resolve);

  const out = `
  export const generated = ${JSON.stringify(generated)}
  `;

  await fs.writeFile('./src/generated.js', out);
}

void sync();
