import { Scanner } from '@tailwindcss/oxide';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/source.ts', 'src/renderer.tsx', 'src/file.ts'],
  format: 'esm',
  target: 'es2023',
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
  deps: {
    onlyBundle: [],
  },
  async onSuccess() {
    await compileInline();
  },
});

async function compileInline() {
  await mkdir('css/generated', { recursive: true });
  const scanner = new Scanner({
    sources: [
      {
        base: path.resolve('src'),
        pattern: '**/*.{ts,tsx}',
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
