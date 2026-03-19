import { defineConfig } from 'tsdown';
import fs from 'node:fs/promises';
import { compileInline } from './scripts/compile-inline.utils';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/*.{ts,tsx}',
    './src/{components,tailwind,contexts,layouts,provider,og}/**/*.{ts,tsx}',
    './src/utils/use-*.{ts,tsx}',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: true,
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
