import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { log, confirm, isCancel, outro, spinner, intro } from '@clack/prompts';
import { type Project } from 'ts-morph';
import picocolors from 'picocolors';
import { defineWorkspace } from 'vitest/config';
import { createEmptyProject } from '@/utils/typescript';
import { getPackageManager } from '@/utils/get-package-manager';
import { isSrc } from '@/utils/is-src';
import { exists } from '@/utils/fs';

/**
 * A set of downloaded paths (without ext)
 */
const downloadedFiles = new Map<string, FindResult>();
const excludedDeps = ['react', 'next', 'fumadocs-ui', 'fumadocs-core'];

export async function add(
  name: string,
  branch = 'main',
  outDir = 'components',
): Promise<void> {
  intro(picocolors.bold(picocolors.cyan(picocolors.black('Add Component'))));
  const project = createEmptyProject();

  const result = await downloadFile(
    `src/components/${name}`,
    path.resolve(outDir, name),
    project,
    branch,
  );

  if (!result) {
    log.error(`Component: ${name} not found`);
    process.exit(0);
  }

  const deps = result.deps.filter((v) => !excludedDeps.includes(v));
  const value = await confirm({
    message: `This component requires extra dependencies (${deps.join(' ')}), do you want to install?`,
  });

  if (isCancel(value)) {
    outro(picocolors.bold(picocolors.greenBright('Component downloaded')));
    process.exit(0);
  }

  if (value) {
    const spin = spinner();
    spin.start('Installing dependencies...');
    spawnSync(`${await getPackageManager()} install ${deps.join(' ')}`, {
      stdio: 'ignore',
    });
    spin.stop('Dependencies installed.');
  }

  outro(picocolors.bold(picocolors.greenBright('Component installed')));
}

async function downloadFile(
  pathWithoutExt: string,
  outPathWithoutExt: string,
  project: Project,
  branch = 'main',
): Promise<
  | {
      deps: string[];
      found: FindResult;
    }
  | undefined
> {
  const deps: string[] = [];
  const rootUrl = `https://raw.githubusercontent.com/fuma-nama/fumadocs/${branch}/packages/ui`;

  const found = await find(rootUrl, pathWithoutExt);
  if (!found) return;

  const outPath = `${outPathWithoutExt}.${found.ext}`;
  const file = project.createSourceFile(outPath, found.code, {
    overwrite: true,
  });

  for (const item of file.getImportDeclarations()) {
    const src = item.getModuleSpecifier().getLiteralValue();

    const reference = await downloadReference(src, outPath, project, branch);
    item.getModuleSpecifier().setLiteralValue(reference.replaceSrc);
    deps.push(...reference.deps);
  }

  for (const item of file.getExportDeclarations()) {
    const specifier = item.getModuleSpecifier();
    if (!specifier) continue;

    const reference = await downloadReference(
      specifier.getLiteralValue(),
      outPath,
      project,
      branch,
    );
    specifier.setLiteralValue(reference.replaceSrc);
    deps.push(...reference.deps);
  }

  const isOverride = await exists(file.getFilePath());

  if (isOverride) {
    const value = await confirm({
      message: `Do you want to override ${file.getFilePath()}?`,
    });

    if (isCancel(value)) {
      outro('Ended');
      process.exit(0);
    }

    if (value) {
      await file.save();
    }
  } else {
    await file.save();
  }

  return {
    found,
    deps,
  };
}

/**
 * Download referenced files, given an import/export module specifier. (e.g. `@/files`)
 */
async function downloadReference(
  src: string,
  sourceFile: string,
  project: Project,
  branch: string,
): Promise<{
  replaceSrc: string;
  deps: string[];
}> {
  const resolved = resolveImport(src);

  if (resolved.type === 'dep') {
    return {
      replaceSrc: src,
      deps: [resolved.name],
    };
  }

  const resolvedOut = (await isSrc())
    ? resolved.pathWithoutExt
    : path.relative('src', resolved.pathWithoutExt);

  const res = await downloadFile(
    resolved.pathWithoutExt,
    resolvedOut,
    project,
    branch,
  );

  if (!res) {
    throw new Error(`${resolved.pathWithoutExt} not found`);
  }

  const importPath = path.relative(
    path.dirname(sourceFile),
    `${resolvedOut}.${res.found.ext}`,
  );

  return {
    replaceSrc: importPath.startsWith('../') ? importPath : `./${importPath}`,
    deps: res.deps,
  };
}

interface FindResult {
  ext: string;
  code: string;
}

async function find(
  rootUrl: string,
  pathWithoutExt: string,
): Promise<FindResult | undefined> {
  const cached = downloadedFiles.get(pathWithoutExt);
  if (cached) return cached;

  for (const ext of resolveExtensions) {
    const res = await fetch(`${rootUrl}/${pathWithoutExt}.${ext}`);
    if (!res.ok) continue;
    log.step(`downloaded ${pathWithoutExt}.${ext}`);

    const result: FindResult = {
      ext,
      code: await res.text(),
    };

    downloadedFiles.set(pathWithoutExt, result);
    return result;
  }
}

/**
 * Only look for TypeScript extensions
 */
const resolveExtensions = ['tsx', 'ts'];

function resolveImport(src: string):
  | {
      type: 'dep';
      name: string;
    }
  | {
      type: 'file';
      pathWithoutExt: string;
    } {
  if (src.startsWith('@/') || src.startsWith('./') || src.startsWith('../')) {
    return {
      type: 'file',
      pathWithoutExt: path.join('./src', src.slice('@/'.length)),
    };
  }

  if (src.startsWith('@')) {
    const segments = src.split('/');

    return {
      type: 'dep',
      name: segments.slice(0, 2).join('/'),
    };
  }

  return {
    type: 'dep',
    name: src.split('/')[0],
  };
}
