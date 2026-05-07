import { defineConfig } from 'tsdown';
import { Scanner } from '@tailwindcss/oxide';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  platform: 'browser',
  entry: [
    './src/*.{ts,tsx}',
    './src/{components,contexts,provider,tailwind,og}/**/*.{ts,tsx}',
    './src/layouts/*/index.tsx',
    './src/layouts/*/page/index.tsx',
    './src/layouts/**/slots/*',
    './src/layouts/home/{navbar,not-found}.tsx',
    './src/utils/use-*.{ts,tsx}',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  css: {
    inject: true,
  },
  async onSuccess() {
    await compileInline();
  },
  deps: {
    onlyBundle: ['react-medium-image-zoom'],
  },
  exports: {
    exclude: ['mdx.server', 'tailwind/typography'],
    customExports: {
      './style.css': './dist/style.css',
      './css/*': './css/*',
      './mdx': {
        types: './dist/mdx.d.ts',
        node: './dist/mdx.server.js',
        import: './dist/mdx.js',
      },
    },
  },
});

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
