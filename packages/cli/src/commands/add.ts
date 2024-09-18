import path from 'node:path';
import fs from 'node:fs/promises';
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
import { typescriptExtensions } from '@/constants';

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
  downloadPath: string,
  outputPath: string,
  ctx: Context,
): Promise<DownloadFileResult | undefined> {
  const rootUrl = `https://raw.githubusercontent.com/fuma-nama/fumadocs/${ctx.branch}/packages/ui`;
  const found = await find(rootUrl, downloadPath);
  if (!found) return;

  const outPath =
    path.extname(outputPath).length > 0
      ? outputPath
      : `${outputPath}${path.extname(found.filePath)}`;
  log.step(`downloaded ${outPath}`);
  const [output, deps] = typescriptExtensions.includes(path.extname(outPath))
    ? await transformTypeScript(outPath, found.code, ctx)
    : [found.code, []];

  let canWrite = true;

  if (await exists(outPath)) {
    const value = await confirm({
      message: `Do you want to override ${outPath}?`,
    });

    if (isCancel(value)) {
      outro('Ended');
      process.exit(0);
    }

    canWrite = value;
  }

  if (canWrite) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, output);
  }

  return {
    found,
    deps,
  };
}

const transformMap: Record<string, string> = {
  '@/contexts/sidebar': 'fumadocs-ui/provider',
  '@/contexts/i18n': 'fumadocs-ui/provider',
};

async function transformTypeScript(
  filePath: string,
  code: string,
  ctx: Context,
): Promise<[code: string, deps: string[]]> {
  const deps: string[] = [];
  const file = ctx.project.createSourceFile(filePath, code, {
    overwrite: true,
  });

  await transformReferences(
    file,
    {
      alias: 'src',
      relativeTo: path.dirname(filePath),
    },
    async (resolved, original) => {
      if (resolved.type === 'dep') {
        deps.push(resolved.name);
        return;
      }

      if (original === '../../dist/image-zoom.css') {
        const cssOut = path.join(path.dirname(filePath), 'image-zoom.css');
        await downloadFile('css/image-zoom.css', cssOut, ctx);

        return './image-zoom.css';
      }

      if (original in transformMap) return transformMap[original];

      const downloadPath = getOutputPath(
        path.relative('src', resolved.path),
        ctx.config,
      );

      const downloaded = await downloadFile(resolved.path, downloadPath, ctx);
      if (!downloaded)
        throw new Error(`Cannot download file: ${resolved.path}`);

      deps.push(...downloaded.deps);
      return toReferencePath(filePath, downloadPath);
    },
  );

  return [file.getFullText(), deps];
}

interface FindResult {
  filePath: string;
  code: string;
}

async function fetchFile(
  rootUrl: string,
  filePath: string,
): Promise<FindResult | undefined> {
  const res = await fetch(`${rootUrl}/${filePath}`);

  if (res.ok)
    return {
      filePath,
      code: await res.text(),
    };
}

async function find(
  rootUrl: string,
  pathWithoutExt: string,
): Promise<FindResult | undefined> {
  const cached = downloadedFiles.get(pathWithoutExt);
  if (cached) return cached;

  if (path.extname(pathWithoutExt).length > 0) {
    return fetchFile(rootUrl, pathWithoutExt);
  }

  // Only look for TypeScript extensions
  for (const ext of ['tsx', 'ts']) {
    const res = await fetchFile(rootUrl, `${pathWithoutExt}.${ext}`);
    if (!res) continue;

    downloadedFiles.set(pathWithoutExt, res);
    return res;
  }
}
