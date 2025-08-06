import { defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config.js';

export default defineConfig({
  vite: {
    // avoid type problems due to Vite version conflicts
    plugins: [mdx(MdxConfig) as any],
  },
});
