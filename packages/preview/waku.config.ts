import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
import { getConfig } from '@fumadocs/vite';

export default defineConfig({
  distDir: 'dist/waku',
  unstable_adapter: './src/lib/waku/adapter.ts',
  vite: {
    resolve: {
      tsconfigPaths: true,
    },

    plugins: [
      tailwindcss(),
      {
        name: 'internal',
        config() {
          return getConfig({ root: process.cwd() });
        },
      },
    ],
  },
});
