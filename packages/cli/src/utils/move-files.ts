import fs from 'node:fs/promises';
import path from 'node:path';
import { type Project } from 'ts-morph';
import { isRelative } from '@/utils/fs';
import {
  toReferencePath,
  transformReferences,
} from '@/utils/transform-references';

const transformExtensions = ['.js', '.ts', '.tsx', '.jsx'];

/**
 * Move files from directory to another directory
 *
 * And update imports is needed
 */
export async function moveFiles(
  from: string,
  to: string,
  filter: (file: string) => boolean | Promise<boolean>,
  project: Project,
  src: boolean,
  /**
   * the original directory to move files from
   */
  originalDir = from,
): Promise<void> {
  const stats = await fs.lstat(from).catch(() => undefined);
  if (!stats) return;

  if (stats.isDirectory()) {
    const items = await fs.readdir(from);

    await Promise.all(
      items.map(async (item) => {
        await moveFiles(
          path.resolve(from, item),
          path.resolve(to, item),
          filter,
          project,
          src,
          originalDir,
        );
      }),
    );

    await fs.rmdir(from).catch(() => {
      // it is possible that some files are ignored, so the directory isn't empty
    });
  }

  if (!stats.isFile()) return;

  const allowed = await filter(path.resolve(from));
  if (!allowed) return;

  if (transformExtensions.includes(path.extname(from))) {
    const content = await fs.readFile(from);
    const sourceFile = project.createSourceFile(from, content.toString(), {
      overwrite: true,
    });

    await transformReferences(
      sourceFile,
      {
        alias: {
          type: 'append',
          dir: src ? 'src' : '',
        },
        relativeTo: path.dirname(from),
      },
      (resolved) => {
        if (resolved.type !== 'file') return;
        if (isRelative(originalDir, from) && filter(resolved.path)) return;

        return toReferencePath(to, resolved.path);
      },
    );

    await sourceFile.save();
  }

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}
