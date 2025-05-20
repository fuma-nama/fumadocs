import fs from 'node:fs/promises';
import path from 'node:path';
import { type Project } from 'ts-morph';
import { isRelative } from '@/utils/fs';
import {
  resolveReference,
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
  filter: (file: string) => boolean,
  project: Project,
  src: boolean,
  /**
   * the original directory to move files from
   */
  originalDir = from,
) {
  function isIncluded(file: string) {
    // moving files that can't be refactored will cause issues, e.g. relative paths in CSS file being overlooked
    if (!transformExtensions.includes(path.extname(file))) return false;

    return filter(path.resolve(file));
  }

  const stats = await fs.lstat(from).catch(() => undefined);
  if (!stats) return;

  if (stats.isDirectory()) {
    const items = await fs.readdir(from);

    await Promise.all(
      items.map(async (item) => {
        await moveFiles(
          path.join(from, item),
          path.join(to, item),
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

  if (!stats.isFile() || !isIncluded(from)) return;

  const content = await fs.readFile(from);
  const sourceFile = project.createSourceFile(from, content.toString(), {
    overwrite: true,
  });

  transformReferences(sourceFile, (specifier) => {
    const resolved = resolveReference(specifier, {
      alias: {
        type: 'append',
        dir: src ? 'src' : '',
      },
      relativeTo: path.dirname(from),
    });
    if (resolved.type !== 'file') return;
    if (
      // ignore if the file is also moved
      isRelative(originalDir, from) &&
      isIncluded(resolved.path)
    )
      return;

    return toReferencePath(to, resolved.path);
  });

  await sourceFile.save();
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}
