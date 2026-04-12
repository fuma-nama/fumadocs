import { defineConfig, type Config } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config.js';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';

export default defineConfig({
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), mdx(MdxConfig)],
  } satisfies UserConfig as Config['vite'],
});
