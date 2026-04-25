import { Scanner } from '@tailwindcss/oxide';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function compileInline() {
  await mkdir('css/generated', { recursive: true });
  const scanner = new Scanner({
    sources: [
      {
        base: path.resolve('src'),
        pattern: 'components/**/*.{ts,tsx}',
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
    ],
  });

  const commonNames = scanner.scan();
  await writeFile('css/generated/shared.css', namesToFile(commonNames));

  const layouts = ['flux', 'notebook', 'home', 'docs'];
  const commonNameSet = new Set(commonNames);

  for (const layout of layouts) {
    const scanner = new Scanner({
      sources: [
        {
          base: path.resolve('src'),
          pattern: `layouts/${layout}/**/*.{ts,tsx}`,
          negated: false,
        },
      ],
    });

    await writeFile(
      `css/generated/${layout}.css`,
      namesToFile(scanner.scan().filter((name) => !commonNameSet.has(name))),
    );
  }

  console.log('generated CSS files');
}

function namesToFile(names: string[]) {
  return names.map((name) => `@source inline(${JSON.stringify(name)});`).join('\n');
}
