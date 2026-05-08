import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import mdx from 'fumadocs-mdx/vite';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [mdx(), tailwindcss(), reactRouter()],
});
