import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
import press from 'fumapress/vite';
import mdx from 'fumadocs-mdx/vite';

export default defineConfig({
  vite: {
    plugins: [press(), mdx(), tailwindcss()],
  },
});
