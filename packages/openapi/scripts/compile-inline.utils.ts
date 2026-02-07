import { compile } from '@fumadocs/tailwind/compile';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function compileInline() {
  await mkdir('css/generated', { recursive: true });
  await writeFile(
    'css/generated/shared.css',
    compile([
      {
        base: path.resolve('src'),
        pattern: '{playground,scalar,ui}/**/*.{ts,tsx}',
        negated: false,
      },
      {
        base: path.resolve('src'),
        pattern: 'server/**/*.tsx',
        negated: false,
      },
    ]),
  );

  console.log('generated CSS files');
}
