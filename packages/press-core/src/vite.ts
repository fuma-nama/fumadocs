import * as waku from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import type { PluginOption } from 'vite';
import * as vite from 'vite';
import { crawlFrameworkPkgs } from 'vitefu';

export function defineConfig(config: waku.Config) {
  return waku.defineConfig({
    ...config,
    vite: {
      ...config.vite,
      plugins: [press(), ...(config.vite?.plugins ?? [])],
    },
  });
}

export function press(): PluginOption {
  return [
    pressCore(),
    mdx(
      vite.runnerImport<Record<string, unknown>>('/source.config').then((mod) => mod.module),
      {
        updateViteConfig: false,
      },
    ),
  ];
}

export function pressCore(): PluginOption {
  return {
    name: 'fumapress:core',
    async config(_, { command }) {
      const out = await crawlFrameworkPkgs({
        root: process.cwd(),
        isBuild: command === 'build',
        isFrameworkPkgByName(pkgName) {
          switch (pkgName) {
            case '@fumapress/core':
            case 'fumadocs-core':
            case 'fumadocs-ui':
            case 'fumadocs-openapi':
            case '@fumadocs/base-ui':
            case 'fumadocs-mdx':
              return true;
          }
        },
      });

      return {
        ssr: {
          noExternal: out.ssr.noExternal,
          external: ['@takumi-rs/image-response'],
        },
        optimizeDeps: out.optimizeDeps,
      };
    },
    async resolveId(source, importer, options) {
      const match = /^virtual:root\.css(\?.*)?$$/.exec(source);

      if (match) {
        const query = match[1] ?? '';
        const out = await this.resolve(`/src/app.css${query}`, importer, options);
        if (out === null)
          return this.resolve(`@fumapress/core/css/default.css${query}`, importer, options);
        return out;
      }
    },
  };
}
