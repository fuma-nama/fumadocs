import path from 'node:path';
import fs from 'node:fs/promises';
import { confirm, isCancel, log, outro } from '@clack/prompts';
import { type Project } from 'ts-morph';
import { createEmptyProject } from '@/utils/typescript';
import { type Config, defaultConfig } from '@/config';
import { typescriptExtensions } from '@/constants';
import {
  type NamespaceType,
  type OutputComponent,
  type OutputFile,
} from '@/build';
import { type Awaitable } from '@/commands/init';
import {
  toReferencePath,
  transformReferences,
} from '@/utils/transform-references';

interface Context {
  config: Config;
  project: Project;

  resolver: Resolver;
}

export type Resolver = (file: string) => Awaitable<object | undefined>;

/**
 * A set of downloaded files
 */
const downloadedFiles = new Set<string>();

export async function installComponent(
  name: string,
  resolver: Resolver,
  config: Config = {},
): Promise<OutputComponent | undefined> {
  const project = createEmptyProject();

  return downloadComponent(name, {
    project,
    config,
    resolver,
  });
}

const downloadedComps = new Map<string, OutputComponent>();
async function downloadComponent(
  name: string,
  ctx: Context,
): Promise<OutputComponent | undefined> {
  const cached = downloadedComps.get(name);
  if (cached) return cached;

  const comp = (await ctx.resolver(`${name}.json`)) as
    | OutputComponent
    | undefined;
  if (!comp) return;

  downloadedComps.set(name, comp);

  for (const file of comp.files) {
    if (downloadedFiles.has(file.path)) continue;

    const outPath = resolveOutputPath(file.path, ctx.config);
    const output = typescriptExtensions.includes(path.extname(file.path))
      ? transformTypeScript(outPath, file, ctx)
      : file.content;

    let canWrite = true;
    const requireOverride = await fs
      .readFile(outPath)
      .then((res) => res.toString() !== output)
      .catch(() => false);

    if (requireOverride) {
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

    downloadedFiles.add(file.path);
  }

  for (const sub of comp.subComponents) {
    const downloaded = await downloadComponent(sub, ctx);
    if (!downloaded) continue;

    Object.assign(comp.dependencies, downloaded.dependencies);
    Object.assign(comp.devDependencies, downloaded.devDependencies);
  }

  return comp;
}

function resolveOutputPath(ref: string, config: Config): string {
  const sep = ref.indexOf(':');
  if (sep === -1) return ref;

  const namespace = ref.slice(0, sep) as NamespaceType,
    file = ref.slice(sep + 1);

  if (namespace === 'components') {
    return path.join(
      config.aliases?.componentsDir ?? defaultConfig.aliases.componentsDir,
      file,
    );
  }

  return path.join(
    config.aliases?.libDir ?? defaultConfig.aliases.libDir,
    file,
  );
}

function transformTypeScript(
  filePath: string,
  file: OutputFile,
  ctx: Context,
): string {
  const sourceFile = ctx.project.createSourceFile(filePath, file.content, {
    overwrite: true,
  });

  transformReferences(sourceFile, (specifier) => {
    if (specifier in file.imports) {
      const outputPath = resolveOutputPath(file.imports[specifier], ctx.config);
      return toReferencePath(filePath, outputPath);
    }
  });

  return sourceFile.getFullText();
}

export function remoteResolver(url: string): Resolver {
  return async (file) => {
    const res = await fetch(`${url}/${file}`);
    if (!res.ok) return;

    return res.json();
  };
}

export function localResolver(dir: string): Resolver {
  return async (file) => {
    return await fs
      .readFile(path.join(dir, file))
      .then((res) => JSON.parse(res.toString()) as OutputComponent)
      .catch(() => undefined);
  };
}
