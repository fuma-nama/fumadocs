import { defineConfig } from 'tsdown';
import { Scanner } from '@tailwindcss/oxide';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default defineConfig({
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/components/search.tsx'],
  dts: {
    sourcemap: false,
  },
  unbundle: true,
  exports: {
    customExports: {
      './css/preset.css': './css/preset.css',
    },
  },
  deps: {
    onlyBundle: [],
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
