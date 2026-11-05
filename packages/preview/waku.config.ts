import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
import { getConfig } from '@fumadocs/vite';

export default defineConfig({
  distDir: 'dist/waku',
  vite: {
    resolve: {
      tsconfigPaths: true,
      // workspace packages may link another instance of `waku`, the bundle must hold only one
      dedupe: ['waku'],
    },

    plugins: [
      tailwindcss(),
      {
        name: 'internal',
        config(_, env) {
          return getConfig({ root: process.cwd(), isBuild: env.command === 'build' });
        },
      },
    ],
  },
});
