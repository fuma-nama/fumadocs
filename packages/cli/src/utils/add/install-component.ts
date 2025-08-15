import path from 'node:path';
import fs from 'node:fs/promises';
import { confirm, isCancel, log, outro } from '@clack/prompts';
import { createEmptyProject } from '@/utils/typescript';
import { type LoadedConfig } from '@/config';
import { typescriptExtensions } from '@/constants';
import {
  toImportSpecifier,
  transformReferences,
} from '@/utils/transform-references';
import type { OutputComponent, OutputFile } from '@/registry/schema';
import { validateRegistryComponent } from '@/registry/client';

export type Resolver = (file: string) => Promise<unknown | undefined>;

type DownloadedComponents = Omit<OutputComponent, 'subComponents'>[];

export type ComponentInstaller = ReturnType<typeof createComponentInstaller>;

export function createComponentInstaller(options: {
  resolver: Resolver;
  config: LoadedConfig;
}) {
  const { config, resolver } = options;
  const project = createEmptyProject();
  const installedFiles = new Set<string>();
  const downloadedComps = new Map<string, DownloadedComponents>();

  function buildFileList(downloaded: DownloadedComponents): OutputFile[] {
    const map = new Map<string, OutputFile>();
    for (const item of downloaded) {
      for (const file of item.files) {
        const filePath = file.target ?? file.path;

        if (map.has(filePath)) {
          console.warn(
            `noticed duplicated output file for ${filePath}, ignoring for now.`,
          );
          continue;
        }

        map.set(filePath, file);
      }
    }

    return Array.from(map.values());
  }

  return {
    async install(name: string) {
      const downloaded = await this.download(name);
      const dependencies: Record<string, string | null> = {};
      const devDependencies: Record<string, string | null> = {};

      for (const item of downloaded) {
        Object.assign(dependencies, item.dependencies);
        Object.assign(devDependencies, item.devDependencies);
      }

      const fileList = buildFileList(downloaded);

      for (const file of fileList) {
        const filePath = file.target ?? file.path;
        if (installedFiles.has(filePath)) continue;

        const outPath = this.resolveOutputPath(file);
        const output = typescriptExtensions.includes(path.extname(filePath))
          ? this.transform(outPath, file, fileList)
          : file.content;

        const status = await fs
          .readFile(outPath)
          .then((res) => {
            if (res.toString() === output) return 'ignore';
            return 'need-update';
          })
          .catch(() => 'write');

        installedFiles.add(filePath);
        if (status === 'ignore') continue;

        if (status === 'need-update') {
          const override = await confirm({
            message: `Do you want to override ${outPath}?`,
            initialValue: false,
          });

          if (isCancel(override)) {
            outro('Ended');
            process.exit(0);
          }

          if (!override) continue;
        }

        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, output);
        log.step(`downloaded ${outPath}`);
      }

      return {
        dependencies,
        devDependencies,
      };
    },
    /**
     * return a list of components, merged with child components.
     */
    async download(name: string): Promise<DownloadedComponents> {
      const cached = downloadedComps.get(name);
      if (cached) return cached;

      const comp = validateRegistryComponent(
        await resolver(`${name}.json`).then((res) => {
          if (!res) {
            log.error(`component ${name} not found`);
            process.exit(1);
          }

          return res;
        }),
      );
      const result: DownloadedComponents = [comp];

      // place it before downloading child components to avoid recursive downloads
      downloadedComps.set(name, result);

      for (const sub of comp.subComponents) {
        result.push(...(await this.download(sub)));
      }

      return result;
    },
    transform(filePath: string, file: OutputFile, fileList: OutputFile[]) {
      const sourceFile = project.createSourceFile(filePath, file.content, {
        overwrite: true,
      });

      transformReferences(sourceFile, (specifier) => {
        const prefix = '@/';

        if (specifier.startsWith(prefix)) {
          const lookup = specifier.substring(prefix.length);

          const target = fileList.find((item) => {
            const filePath = item.target ?? item.path;

            return filePath === lookup;
          });

          if (!target) {
            console.warn(`cannot find the referenced file of ${specifier}`);
            return specifier;
          }

          return toImportSpecifier(filePath, this.resolveOutputPath(target));
        }
      });

      return sourceFile.getFullText();
    },

    resolveOutputPath(ref: OutputFile): string {
      if (ref.target) {
        return path.join(config.baseDir, ref.target);
      }

      const base = path.basename(ref.path);
      const dir = (
        {
          components: config.aliases.componentsDir,
          block: config.aliases.blockDir,
          ui: config.aliases.uiDir,
          css: config.aliases.cssDir,
          lib: config.aliases.libDir,
          route: './',
        } as const
      )[ref.type];

      return path.join(config.baseDir, dir, base);
    },
  };
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
