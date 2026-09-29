import { defineConfig } from 'tsdown';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Scanner } from '@tailwindcss/oxide';

export default defineConfig({
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  dts: true,
  entry: ['src/{index,client}.ts', 'src/bin.ts', 'src/dev/{vite,ws}.ts', 'src/ui/index.tsx'],
  async onSuccess() {
    await compileInline();
  },
  exports: {
    bin: {
      'fumadocs-obsidian': './src/bin.ts',
    },
    exclude: ['bin'],
    customExports(v) {
      v['./css/*'] = './css/*';
      return v;
    },
  },
  deps: {
    onlyBundle: [],
  },
});

async function compileInline() {
  await mkdir('css/generated', { recursive: true });
  const scanner = new Scanner({
    sources: [
      {
        base: path.resolve('src'),
        pattern: 'ui/**/*.{ts,tsx}',
        negated: false,
      },
    ],
  });
  await writeFile('css/generated/shared.css', namesToFile(scanner.scan()));

  console.log('generated CSS files');
}

function namesToFile(names: string[]) {
  return `@source inline(${JSON.stringify(names.join(' '))});`;
}
