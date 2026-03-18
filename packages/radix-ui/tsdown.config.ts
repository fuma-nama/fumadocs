import { defineConfig } from 'tsdown';
import fs from 'node:fs/promises';
import { compileInline } from './scripts/compile-inline.utils';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/*.{ts,tsx}',
    './src/{components,contexts,provider,tailwind,og}/**/*.{ts,tsx}',
    './src/layouts/*/{index,client}.tsx',
    './src/layouts/*/page/{index,client}.tsx',
    './src/layouts/home/{navbar,not-found}.tsx',
    './src/utils/use-*.{ts,tsx}',
    './src/utils/renderer.ts',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  async onSuccess() {
    await compileInline();

    let content = (await fs.readFile('dist/components/image-zoom.js')).toString();
    const lines = content.split('\n');
    lines.splice(1, 0, `import "./image-zoom.css";`);
    content = lines.join('\n');
    await fs.writeFile('dist/components/image-zoom.js', content);
    console.log('CSS import updated');
  },
  deps: {
    onlyBundle: [],
  },
});
