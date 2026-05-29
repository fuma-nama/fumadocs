import { defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    resolve: {
      tsconfigPaths: true,
      external: ['@takumi-rs/image-response'],
      dedupe: ['waku'],
    },

    plugins: [tailwindcss(), mdx()],
  },
});
