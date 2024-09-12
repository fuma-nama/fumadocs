import path from 'node:path';
import { sync as spawnSync } from 'cross-spawn';
import { log, confirm, isCancel, outro, spinner, intro } from '@clack/prompts';
import { type Project } from 'ts-morph';
import picocolors from 'picocolors';
import { createEmptyProject } from '@/utils/typescript';
import { getPackageManager } from '@/utils/get-package-manager';
import { exists } from '@/utils/fs';
import { type Config } from '@/config';
import {
  getOutputPath,
  toReferencePath,
  transformReferences,
} from '@/utils/transform-references';
import { isSrc } from '@/utils/is-src';

interface Context {
  config: Config;
  project: Project;
  branch: string;
  src: boolean;
}

/**
 * A set of downloaded paths (without ext)
 */
const downloadedFiles = new Map<string, FindResult>();
const excludedDeps = ['react', 'next', 'fumadocs-ui', 'fumadocs-core'];

export async function add(
  name: string,
  branch = 'main',
  config: Config = {},
): Promise<void> {
  intro(picocolors.bold(picocolors.bgCyan(picocolors.black('Add Component'))));
  const project = createEmptyProject();

  const result = await downloadFile(
    `src/components/${name}`,
    getOutputPath(`components/${name}`, config),
    {
      project,
      branch,
      config,
      src: await isSrc(),
    },
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

interface DownloadFileResult {
  deps: string[];
  found: FindResult;
}

async function downloadFile(
  pathWithoutExt: string,
  outPathWithoutExt: string,
  ctx: Context,
): Promise<DownloadFileResult | undefined> {
  const deps: string[] = [];
  const rootUrl = `https://raw.githubusercontent.com/fuma-nama/fumadocs/${ctx.branch}/packages/ui`;

  const found = await find(rootUrl, pathWithoutExt);
  if (!found) return;

  const outPath = `${outPathWithoutExt}.${found.ext}`;
  const file = ctx.project.createSourceFile(outPath, found.code, {
    overwrite: true,
  });

  await transformReferences(
    file,
    {
      alias: 'src',
      relativeTo: path.dirname(pathWithoutExt),
    },
    async (resolved) => {
      if (resolved.type === 'dep') {
        deps.push(resolved.name);
        return;
      }

      const downloadPath = getOutputPath(
        path.relative('src', resolved.path),
        ctx.config,
      );

      const downloaded = await downloadFile(resolved.path, downloadPath, ctx);
      if (!downloaded)
        throw new Error(`Cannot download file: ${resolved.path}`);

      deps.push(...downloaded.deps);
      return toReferencePath(outPath, downloadPath);
    },
  );

  const isOverride = await exists(outPath);

  if (isOverride) {
    const value = await confirm({
      message: `Do you want to override ${outPath}?`,
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
