import { type Config, defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';

export default defineConfig({
  vite: {
    resolve: {
      tsconfigPaths: true,
      external: ['@takumi-rs/image-response'],
    },

    plugins: [tailwindcss(), mdx()],
  } satisfies UserConfig as Config['vite'],
});
