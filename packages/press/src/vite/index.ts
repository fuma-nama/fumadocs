import { type Plugin, type PluginOption } from 'vite';
import path from 'node:path';
import { defineConfig, type FumapressConfig } from '../config/global.js';

export async function fumapress(config: Partial<FumapressConfig> = {}): Promise<PluginOption[]> {
  const resolved = defineConfig(config);

  return [init(null, resolved)];
}

function init(configPath: string | null, _config: FumapressConfig): Plugin {
  return {
    name: 'fumapress:init',
    configEnvironment(_name, env) {
      if (env.optimizeDeps?.include) {
        env.optimizeDeps.include = env.optimizeDeps.include.map((entry) => {
          if (entry.startsWith('@vitejs/plugin-rsc')) {
            entry = `fumapress > ${entry}`;
          }
          return entry;
        });
      }
    },
    configureServer(server) {
      if (!configPath) return;

      server.watcher.on('change', async (file) => {
        const fullConfigPath = path.resolve(configPath);
        if (fullConfigPath === file) {
          console.log(`Config changed: ${file}. Restarting dev server.`);
          await server.restart();
        }
      });
    },
  };
}
