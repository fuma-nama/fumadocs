import path from 'node:path';
import fs from 'node:fs/promises';
import { log, confirm, isCancel, outro, spinner, intro } from '@clack/prompts';
import { type Project } from 'ts-morph';
import picocolors from 'picocolors';
import { execa } from 'execa';
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
import { getDependencies } from '@/utils/add/get-dependencies';

interface Context {
  config: Config;
  project: Project;
  branch: string;
  src: boolean;
}

/**
 * A set of downloaded files
 */
const downloadedFiles = new Map<string, DownloadFileResult>();
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

  const installed = await getDependencies();
  const deps = Array.from(result.deps).filter(
    (v) => !installed.has(v) && !excludedDeps.includes(v),
  );

  if (deps.length > 0) {
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
      await execa(await getPackageManager(), ['install', ...deps]);
      spin.stop('Dependencies installed.');
    }
  }

  outro(picocolors.bold(picocolors.greenBright('Component installed')));
}

interface DownloadFileResult {
  deps: Set<string>;
  found: FetchResult;
}

async function downloadFile(
  referencePath: string,
  outputPath: string,
  ctx: Context,
): Promise<DownloadFileResult | undefined> {
  const rootUrl = `https://raw.githubusercontent.com/fuma-nama/fumadocs/${ctx.branch}/packages/ui`;
  const found = await fetchReference(rootUrl, referencePath);
  if (!found) return;

  const cached = downloadedFiles.get(found.filePath);
  if (cached) return cached;

  const outPath =
    path.extname(outputPath).length > 0
      ? outputPath
      : `${outputPath}${path.extname(found.filePath)}`;
  const [output, deps] = typescriptExtensions.includes(
    path.extname(found.filePath),
  )
    ? await transformTypeScript(found.filePath, found.code, outPath, ctx)
    : [found.code, new Set<string>()];

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
    log.step(`downloaded ${outPath}`);
  }

  const result: DownloadFileResult = {
    found,
    deps,
  };

  downloadedFiles.set(found.filePath, result);
  return result;
}

const transformMap: Record<string, string> = {
  '@/contexts/sidebar': 'fumadocs-ui/provider',
  '@/contexts/i18n': 'fumadocs-ui/provider',
};

async function transformTypeScript(
  filePath: string,
  code: string,
  outputPath: string,
  ctx: Context,
): Promise<[code: string, deps: Set<string>]> {
  const deps = new Set<string>();
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
        deps.add(resolved.name);
        return;
      }

      // image-zoom component requires CSS file
      if (original === '../../dist/image-zoom.css') {
        const cssOut = path.join(path.dirname(outputPath), 'image-zoom.css');
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

      downloaded.deps.forEach((dep) => deps.add(dep));
      return toReferencePath(outputPath, downloadPath);
    },
  );

  return [file.getFullText(), deps];
}

interface FetchResult {
  filePath: string;
  code: string;
}

async function fetchFile(
  rootUrl: string,
  filePath: string,
): Promise<FetchResult | undefined> {
  const res = await fetch(`${rootUrl}/${filePath}`);

  if (res.ok)
    return {
      filePath,
      code: await res.text(),
    };
}

const referenceMap = new Map<string, FetchResult>();

async function fetchReference(
  rootUrl: string,
  referencePath: string,
): Promise<FetchResult | undefined> {
  const cached = referenceMap.get(referencePath);
  if (cached) return cached;

  if (path.extname(referencePath).length > 0) {
    return fetchFile(rootUrl, referencePath);
  }

  // Only look for TypeScript extensions
  for (const ext of ['tsx', 'ts']) {
    const res = await fetchFile(rootUrl, `${referencePath}.${ext}`);
    if (!res) continue;

    referenceMap.set(referencePath, res);
    return res;
  }
}
