import { defineConfig } from 'tsdown';
import fs from 'node:fs/promises';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/**/*.{ts,tsx}', '!./src/_registry'],
  fixedExtension: false,
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  async onSuccess() {
    // wait until https://github.com/rolldown/tsdown/issues/472
    let content = (await fs.readFile('dist/components/image-zoom.js')).toString();
    content = content.replaceAll(`import "./image-zoom2.js";`, `import "./image-zoom.css";`);
    await fs.writeFile('dist/components/image-zoom.js', content);
    console.log('CSS import updated');
  },
});
