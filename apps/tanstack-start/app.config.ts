import { defineConfig } from '@tanstack/react-start/config';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { source } from './lib/source';
import * as path from 'node:path';
import type { PluginOption } from 'vite';

function contentHotReload(): PluginOption {
  return {
    name: 'fumadocs-hot-reload',
    handleHotUpdate({ file, server }) {
      const isRelative = !path.relative('content', file).startsWith('..');

      if (isRelative) {
        console.log('Content file updated');
        const module = server.moduleGraph.getModulesByFile(
          path.resolve('lib/source.ts'),
        );

        if (!module) {
          console.log('not found', server.moduleGraph.fileToModulesMap.keys());
          return;
        }

        void server.reloadModule(module.values().next().value);
      }
    },
  };
}

export default defineConfig({
  server: {
    hooks: {
      'prerender:routes': (routes) => {
        const pages = source.getPages();

        for (const page of pages) {
          routes.add(page.url);
        }
      },
    },
    prerender: {
      routes: ['/'],
      crawlLinks: true,
    },
  },
  vite: {
    plugins: [
      contentHotReload(),
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
    ],
  },
});
