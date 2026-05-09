import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
import { crawlFrameworkPkgs } from 'vitefu';

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
        async config(_, { command }) {
          const out = await crawlFrameworkPkgs({
            root: process.cwd(),
            isBuild: command === 'build',
            isFrameworkPkgByName(pkgName) {
              if (
                pkgName.startsWith('@fumapress/') ||
                pkgName.startsWith('@fumadocs/') ||
                pkgName.startsWith('fumadocs-') ||
                pkgName === 'fumapress'
              )
                return true;
            },
          });

          return {
            ssr: {
              noExternal: out.ssr.noExternal,
            },
            optimizeDeps: out.optimizeDeps,
          };
        },
      },
    ],
  },
});
