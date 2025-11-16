import { type Config, defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config.js';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { UserConfig } from 'vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss(), mdx(MdxConfig), tsconfigPaths()],
  } satisfies UserConfig as Config['vite'],
});
