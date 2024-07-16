import * as fs from 'node:fs';

let firstLoad = true;

interface Options {
  /**
   * Absolute path of .map file
   */
  rootMapFile: string;
}

const content = `
/** Auto-generated **/
declare const map: Record<string, unknown>

export { map }
`.trim();

export class RootMapFile {
  options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  create(): boolean {
    if (firstLoad && !fs.existsSync(this.options.rootMapFile)) {
      fs.writeFileSync(this.options.rootMapFile, content);
      firstLoad = false;
      return true;
    }
    return false;
  }
}
