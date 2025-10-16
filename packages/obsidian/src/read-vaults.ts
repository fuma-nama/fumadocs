import { glob } from 'tinyglobby';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface VaultFile {
  /**
   * paths relative to vault folder
   */
  path: string;

  _raw: {
    /**
     * original path, either:
     * - relative to cwd
     * - absolute
     */
    path: string;
  };

  content: string | Buffer<ArrayBufferLike>;
}

export interface ReadFilesOptions {
  include?: string | string[];
  dir: string;
}

export async function readVaultFiles(
  options: ReadFilesOptions,
): Promise<VaultFile[]> {
  const { include = '**/*', dir } = options;
  const paths = await glob(include, { cwd: dir });

  return Promise.all(
    paths.map(async (file) => ({
      path: file,
      _raw: {
        path: path.join(dir, file),
      },
      content: await fs.readFile(path.join(dir, file)),
    })),
  );
}
