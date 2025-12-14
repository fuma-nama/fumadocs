import path from 'node:path';
import fs from 'node:fs/promises';
import { confirm, isCancel, log, outro } from '@clack/prompts';
import { createEmptyProject } from '@/utils/typescript';
import { typescriptExtensions } from '@/constants';
import {
  toImportSpecifier,
  transformReferences,
} from '@/utils/transform-references';
import type { ComponentOutput, FileOutput } from '@/registry/schema';
import type { RegistryClient } from '@/registry/client';
import { x } from 'tinyexec';
import { DependencyManager } from '@/registry/installer/dep-manager';

type DownloadedComponents = Omit<ComponentOutput, 'subComponents'>[];

export class ComponentInstaller {
  private readonly project = createEmptyProject();
  private readonly installedFiles = new Set<string>();
  private readonly downloadedComps = new Map<string, DownloadedComponents>();
  private readonly client: RegistryClient;
  readonly dependencies: Record<string, string | null> = {};
  readonly devDependencies: Record<string, string | null> = {};

  constructor(client: RegistryClient) {
    this.client = client;
  }

  async install(name: string) {
    const downloaded = await this.download(name);

    for (const item of downloaded) {
      Object.assign(this.dependencies, item.dependencies);
      Object.assign(this.devDependencies, item.devDependencies);
    }

    const fileList = this.buildFileList(downloaded);

    for (const file of fileList) {
      const filePath = file.target ?? file.path;
      if (this.installedFiles.has(filePath)) continue;

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

      this.installedFiles.add(filePath);
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
  }

  async installDeps() {
    await new DependencyManager().installDeps(
      this.dependencies,
      this.devDependencies,
    );
  }

  async onEnd() {
    const config = this.client.config;
    if (config.commands.format) {
      await x(config.commands.format);
    }
  }

  private buildFileList(downloaded: DownloadedComponents): FileOutput[] {
    const map = new Map<string, FileOutput>();
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

  /**
   * return a list of components, merged with child components.
   */
  private async download(name: string): Promise<DownloadedComponents> {
    const cached = this.downloadedComps.get(name);
    if (cached) return cached;

    const comp = await this.client.fetchComponent(name);
    const result: DownloadedComponents = [comp];

    // place it before downloading child components to avoid recursive downloads
    this.downloadedComps.set(name, result);

    for (const sub of comp.subComponents) {
      result.push(...(await this.download(sub)));
    }

    return result;
  }

  private transform(
    filePath: string,
    file: FileOutput,
    fileList: FileOutput[],
  ) {
    const sourceFile = this.project.createSourceFile(filePath, file.content, {
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
  }

  private resolveOutputPath(ref: FileOutput): string {
    const config = this.client.config;
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
  }
}
