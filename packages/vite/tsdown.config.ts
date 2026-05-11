import { defineConfig } from 'tsdown';
import { crawlFrameworkPkgs } from './vitefu/index.ts';
import type { Generated } from './src/types';
import { writeFile } from 'node:fs/promises';

async function init() {
  const out = await crawlFrameworkPkgs({
    root: '../vite-data',
    isFrameworkPkgByName(pkgName) {
      if (pkgName.startsWith('@fumadocs/') || pkgName.startsWith('fumadocs-')) return true;
    },
  });

  const generated: Generated = {
    optimizeDeps: out.optimizeDeps,
    ssr: {
      noExternal: out.ssr.noExternal,
    },
  };

  await writeFile('src/generated.json', JSON.stringify(generated));
}

await init();

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts'],
  deps: {
    onlyBundle: [],
  },
  exports: true,
});
