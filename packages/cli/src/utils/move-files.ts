import fs from 'node:fs/promises';
import path from 'node:path';
import { type Project, ts } from 'ts-morph';
import { isRelative } from '@/utils/fs';
import SyntaxKind = ts.SyntaxKind;
import { type Stats } from 'node:fs';

const transformExts = ['.js', '.ts', '.tsx', '.jsx'];

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
  /**
   * the original directory to move files from
   */
  originalDir = from,
): Promise<void> {
  let stats: Stats;

  try {
    stats = await fs.lstat(from);
  } catch (_) {
    return;
  }

  if (stats.isDirectory()) {
    const items = await fs.readdir(from);

    await Promise.all(
      items.map(async (item) => {
        await moveFiles(
          path.resolve(from, item),
          path.resolve(to, item),
          filter,
          project,
          originalDir,
        );
      }),
    );

    try {
      await fs.rmdir(from);
    } catch (_) {
      // it is possible that some files are ignored, so the directory isn't empty
    }
  }

  if (!stats.isFile()) return;

  const allowed = await filter(path.resolve(from));
  if (!allowed) return;

  if (transformExts.includes(path.extname(from))) {
    const content = await fs.readFile(from);
    const sourceFile = project.createSourceFile(from, content.toString(), {
      overwrite: true,
    });

    const imports = sourceFile.getDescendantsOfKind(
      SyntaxKind.ImportDeclaration,
    );

    for (const item of imports) {
      const module = item.getModuleSpecifier();
      const file = module.getLiteralValue();

      // ignore absolute/import alias
      // this may create issues, we;ll suggest devs to fix them manually
      if (!file.startsWith('./') && !file.startsWith('../')) continue;
      const importPath = path.resolve(path.dirname(from), file);

      if (isRelative(originalDir, from) && filter(importPath)) continue;
      const newImportPath = path.relative(path.dirname(to), importPath);

      module.setLiteralValue(
        newImportPath.startsWith('../') ? newImportPath : `./${newImportPath}`,
      );
    }

    await sourceFile.save();
  }

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}
