import { defineConfig } from 'tsdown';
import fs from 'node:fs/promises';
import { compileInline } from './scripts/compile-inline.utils';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/*.{ts,tsx}',
    './src/{components,contexts,layouts,provider,tailwind,og}/**/*.{ts,tsx}',
    './src/utils/use-*.{ts,tsx}',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  async onSuccess() {
    await compileInline();
    // wait until https://github.com/rolldown/tsdown/issues/472
    let content = (await fs.readFile('dist/components/image-zoom.js')).toString();
    content = content.replaceAll(`import "./image-zoom2.js";`, `import "./image-zoom.css";`);
    await fs.writeFile('dist/components/image-zoom.js', content);
    console.log('CSS import updated');
  },
  inlineOnly: [],
});
