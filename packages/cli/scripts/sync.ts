import * as fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

export const templates = {
  'lib/metadata': './examples/next-mdx/lib/metadata.ts',
  'app/docs-og/[...slug]/route':
    './examples/next-mdx/app/docs-og/[...slug]/route.tsx',

  'lib/i18n': './examples/i18n/lib/i18n.ts',
  middleware: './examples/i18n/middleware.ts',

  'scripts/generate-docs': './examples/openapi/scripts/generate-docs.mjs',
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

  const files = await fg(['*.tsx', '!api.tsx', '!*.client.tsx'], {
    cwd: path.resolve('../../packages/ui/src/components'),
  });
  const components = files.map((file) =>
    path.basename(file, path.extname(file)),
  );

  const out = `
  export const generated = ${JSON.stringify(generated)}
  export const components = ${JSON.stringify(components)}
  `;

  await fs.writeFile('./src/generated.js', out);
}

void sync();
