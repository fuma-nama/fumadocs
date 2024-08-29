import * as fs from 'node:fs';
import { type Compiler } from 'webpack';
import { loadConfigCached } from '@/config/cached';

let firstLoad = true;

interface Options {
  /**
   * Absolute path of .map file
   */
  rootMapFile: string;

  configPath: string;
}

export class MapWebpackPlugin {
  options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const logger = compiler.getInfrastructureLogger(MapWebpackPlugin.name);
    const loadConfig = loadConfigCached(this.options.configPath);

    compiler.hooks.beforeCompile.tap(MapWebpackPlugin.name, () => {
      if (firstLoad) {
        const lines: string[] = [
          'import type { GetOutput } from "fumadocs-mdx/config"',
        ];

        void loadConfig.then((config) => {
          for (const name of config.collections.keys()) {
            lines.push(
              `export declare const ${name}: GetOutput<typeof import(${JSON.stringify(this.options.configPath)}).${name}>`,
            );
          }

          fs.writeFileSync(this.options.rootMapFile, lines.join('\n'));
          logger.info('Created map.ts file for you automatically');
        });

        firstLoad = false;
      }
    });
  }
}
