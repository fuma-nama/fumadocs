import { defineConfig } from 'tsdown';
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
  },
  deps: {
    onlyAllowBundle: [],
  },
});
