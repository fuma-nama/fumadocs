import { type Config, defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';

export default defineConfig({
  distDir: 'dist/waku',
  unstable_adapter: './src/lib/waku/adapter.ts',
  vite: {
    // we do this to avoid Vite from bundling React contexts and cause duplicated contexts conflicts.
    optimizeDeps: {
      exclude: ['fumadocs-ui', 'fumadocs-core'],
    },
    resolve: {
      external: ['@takumi-rs/image-response', 'unrun', 'chokidar'],
      tsconfigPaths: true,
    },

    plugins: [tailwindcss()],
  } satisfies UserConfig as Config['vite'],
});
