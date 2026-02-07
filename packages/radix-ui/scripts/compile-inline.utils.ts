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
        pattern: '{components,contexts,provider,utils}/**/*.{ts,tsx}',
        negated: false,
      },
      {
        base: path.resolve('src'),
        pattern: 'layouts/shared/**/*.{ts,tsx}',
        negated: false,
      },
      {
        base: path.resolve('src'),
        pattern: '*.{ts,tsx}',
        negated: false,
      },
    ]),
  );

  const layouts = ['flux', 'notebook', 'home', 'docs'];

  for (const layout of layouts) {
    await writeFile(
      `css/generated/${layout}.css`,
      compile([
        {
          base: path.resolve('src'),
          pattern: `layouts/${layout}/**/*.{ts,tsx}`,
          negated: false,
        },
      ]),
    );
  }

  console.log('generated CSS files');
}
