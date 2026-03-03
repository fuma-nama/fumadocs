import { type Config, defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { UserConfig } from 'vite';

export default defineConfig({
  distDir: 'dist/waku',
  vite: {
    // we do this to avoid Vite from bundling React contexts and cause duplicated contexts conflicts.
    optimizeDeps: {
      exclude: ['fumadocs-ui', 'fumadocs-core'],
    },
    ssr: {
      external: ['@takumi-rs/image-response'],
    },

    plugins: [tailwindcss(), tsconfigPaths()],
  } satisfies UserConfig as Config['vite'],
});
