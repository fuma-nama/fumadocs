import type { Plugin, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import mdx from 'fumadocs-mdx/vite';
import path from 'node:path';
import * as MdxConfig from '../config/content';
import { baseDir } from '../constants';
import { findConfigPath, loadConfig } from '../lib/get-config';
import type { FumapressConfig } from '../config/global';
import { findFile } from '../lib/find-file';

const mdxConfigPath = path.join(baseDir, 'src/config/fumadocs-mdx.ts');
const extnames = ['.js', '.ts', '.jsx', '.tsx'];

export function fumapress(): PluginOption[] {
  return [
    resolveDir(),
    react(),
    rsc({
      entries: {
        client: path.join(baseDir, 'src/entry.browser.tsx'),
        rsc: path.join(baseDir, 'src/entry.rsc.tsx'),
        ssr: path.join(baseDir, 'src/entry.ssr.tsx'),
      },
    }),
    mdx(MdxConfig, { configPath: mdxConfigPath, generateIndexFile: false }),
  ];
}

function resolveDir(): Plugin {
  let configPath: string | null;
  let config: FumapressConfig;

  return {
    name: 'fumapress/resolve-dir',
    enforce: 'pre',
    async configResolved() {
      configPath = await findConfigPath();
      config = await loadConfig(configPath);
    },
    resolveId(id) {
      const appDir = 'virtual:app/';

      if (id.startsWith(appDir)) {
        const name = path.join(config.appDir, id.slice(appDir.length));

        return findFile(extnames.map((ext) => name + ext));
      }
    },
    configureServer(server) {
      server.watcher.on('change', async (file) => {
        if (!configPath) return;

        const fullConfigPath = path.resolve(configPath);
        if (fullConfigPath === file) {
          console.log(`Config changed: ${file}. Restarting dev server.`);
          await server.restart();
        }
      });
    },
  };
}
