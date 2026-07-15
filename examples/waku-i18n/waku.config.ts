import { defineConfig, type Config } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';

export default defineConfig({
  vite: {
    resolve: {
      tsconfigPaths: true,
      dedupe: ['waku'],
    },
    plugins: [tailwindcss(), mdx()],
  } satisfies UserConfig as Config['vite'],
});
