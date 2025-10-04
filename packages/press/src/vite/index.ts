import { type Plugin, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import mdx from 'fumadocs-mdx/vite';
import path from 'node:path';
import * as MdxConfig from '../config/content.js';
import { baseDir } from '../constants.js';
import { findConfigPath, loadConfig } from '../lib/get-config.js';
import type { FumapressConfig } from '../config/global.js';
import { findFile } from '../lib/find-file.js';

const mdxConfigPath = path.join(baseDir, 'dist/config/fumadocs-mdx.js');
const extnames = ['.js', '.ts', '.jsx', '.tsx'];

export function fumapress(): PluginOption[] {
  return [
    react(),
    rsc({
      entries: {
        client: path.join(baseDir, 'dist/entry.browser.js'),
        rsc: path.join(baseDir, 'dist/entry.rsc.js'),
        ssr: path.join(baseDir, 'dist/entry.ssr.js'),
      },
    }),
    mdx(MdxConfig, {
      configPath: mdxConfigPath,
      generateIndexFile: false,
      updateViteConfig: false,
    }),
    init(),
  ];
}

function init(): Plugin {
  let configPath: string | null;
  let config: FumapressConfig;
  let routesPath: string | null;

  return {
    name: 'fumapress:init',
    enforce: 'pre',
    configEnvironment(_name, config) {
      if (config.optimizeDeps?.include) {
        config.optimizeDeps.include = config.optimizeDeps.include.map(
          (entry) => {
            if (entry.startsWith('@vitejs/plugin-rsc')) {
              entry = `fumapress > ${entry}`;
            }
            return entry;
          },
        );
      }
    },
    async configResolved(v) {
      configPath = await findConfigPath();
      config = await loadConfig(configPath);

      const name = path.join(config.appDir, 'routes');
      routesPath = (await findFile(extnames.map((ext) => name + ext))) ?? null;
    },
    resolveId(id) {
      if (id == 'virtual:app/routes') return routesPath;
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
