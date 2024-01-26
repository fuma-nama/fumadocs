import fs from 'node:fs';
import type { Compiler } from 'webpack';

let firstLoad = true;

interface Options {
  rootMapFile: string;
}

const content = `
/** Auto-generated **/
declare const map: Record<string, unknown>

export { map }
`.trim();

export class NextDocsWebpackPlugin {
  options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const logger = compiler.getInfrastructureLogger(NextDocsWebpackPlugin.name);

    compiler.hooks.beforeCompile.tap(NextDocsWebpackPlugin.name, () => {
      if (firstLoad && !fs.existsSync(this.options.rootMapFile)) {
        fs.writeFileSync(this.options.rootMapFile, content);
        logger.info('Created map.ts file for you automatically');

        firstLoad = false;
      }
    });
  }
}
