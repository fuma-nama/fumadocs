import { defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content',
  docs: {
    async: true,
  },
});

export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      mdx(
        { docs },
        {
          configPath: 'waku.config.ts',
          generateIndexFile: { out: '.source/index.ts' },
        },
      ),
    ],
  },
});
