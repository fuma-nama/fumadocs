import { defineConfig } from 'tsdown';
import { Scanner } from '@tailwindcss/oxide';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default defineConfig({
  target: 'es2023',
  format: 'esm',
  entry: [
    'src/{index,vite,router}.ts',
    'src/{plugins,adapters}/*',
    'src/layouts/{docs,home,root}.tsx',
    'src/components/provider.tsx',
  ],
  unbundle: true,
  platform: 'neutral',
  dts: true,
  exports: {
    customExports: {
      './css/preset.css': './css/preset.css',
      './css/default.css': './css/default.css',
    },
  },
  deps: {
    onlyBundle: ['vitefu'],
    neverBundle: [/^virtual:/, /^node:/],
  },
  async onSuccess() {
    await compileInline();
  },
});

async function compileInline() {
  const scanner = new Scanner({
    sources: [
      {
        base: path.resolve('src'),
        pattern: '{components,layouts}/**/*.{ts,tsx}',
        negated: false,
      },
    ],
  });

  await writeFile('css/generated.css', namesToFile(scanner.scan()));

  console.log('generated CSS files');
}

function namesToFile(names: string[]) {
  return names.map((name) => `@source inline(${JSON.stringify(name)});`).join('\n');
}
