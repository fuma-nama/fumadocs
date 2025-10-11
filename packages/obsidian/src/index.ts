import { type ReadFilesOptions, readVaultFiles } from '@/read-vaults';
import {
  type ConvertOptions,
  convertVaultFiles,
  type OutputFile,
} from '@/convert';
import path from 'node:path';
import fs from 'node:fs/promises';

export * from './convert';
export * from './read-vaults';
export type * from './build-storage';

export interface Options extends ReadFilesOptions {
  convert?: ConvertOptions;
  out?: WriteFilesOptions;
}

export async function fromVault(options: Options) {
  const files = await readVaultFiles(options);
  const converted = await convertVaultFiles(files, options.convert);

  await writeVaultFiles(converted, options.out);
}

export interface WriteFilesOptions {
  publicDir?: string;
  contentDir?: string;
}

export async function writeVaultFiles(
  files: OutputFile[],
  options: WriteFilesOptions = {},
) {
  const { publicDir = 'public', contentDir = 'content/docs/vault' } = options;

  const map = {
    asset: publicDir,
    content: contentDir,
    custom: '',
  } as const;

  await Promise.all(
    files.map(async (file) => {
      const mappedPath = path.join(map[file.type], file.path);

      await fs.mkdir(path.dirname(mappedPath), { recursive: true });
      await fs.writeFile(mappedPath, file.content);
    }),
  );
}
