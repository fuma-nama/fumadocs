import path from 'node:path';
import fs from 'node:fs/promises';
import { confirm, isCancel, log, outro } from '@clack/prompts';
import { createEmptyProject } from '@/utils/typescript';
import { typescriptExtensions } from '@/constants';
import { toImportSpecifier } from '@/utils/ast';
import type { Component, File } from '@/registry/schema';
import type { RegistryClient } from '@/registry/client';
import { x } from 'tinyexec';
import { DependencyManager } from '@/registry/installer/dep-manager';
import { AsyncCache } from '@/utils/cache';

type DownloadedComponents = Omit<Component, 'subComponents'>[];

export class ComponentInstaller {
  private readonly project = createEmptyProject();
  private readonly installedFiles = new Set<string>();
  private readonly downloadCache = new AsyncCache<DownloadedComponents>();
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
        ? await this.transform(outPath, file, fileList)
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

  private buildFileList(downloaded: DownloadedComponents): File[] {
    const map = new Map<string, File>();
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
  private download(
    name: string,
  ): DownloadedComponents | Promise<DownloadedComponents> {
    return this.downloadCache.cached(name, async () => {
      const comp = await this.client.fetchComponent(name);
      const result: DownloadedComponents = [comp];

      // place it before downloading child components to avoid recursive downloads
      this.downloadCache.store.set(name, result);

      const child = await Promise.all(
        comp.subComponents.map((sub) => this.download(sub)),
      );
      for (const sub of child) result.push(...sub);
      return result;
    });
  }

  private async transform(
    filePath: string,
    file: File,
    fileList: File[],
  ): Promise<string> {
    const sourceFile = this.project.createSourceFile(filePath, file.content, {
      overwrite: true,
    });

    // transform alias
    const prefix = '@/';
    for (const specifier of sourceFile.getImportStringLiterals()) {
      if (specifier.getLiteralValue().startsWith(prefix)) {
        const lookup = specifier.getLiteralValue().substring(prefix.length);

        const target = fileList.find((item) => {
          const filePath = item.target ?? item.path;

          return filePath === lookup;
        });

        if (target) {
          specifier.setLiteralValue(
            toImportSpecifier(filePath, this.resolveOutputPath(target)),
          );
        } else {
          console.warn(`cannot find the referenced file of ${specifier}`);
        }
      }
    }

    // switchables
    // TODO: handle namespace imports like MySwitchable.member
    for (const statement of sourceFile.getImportDeclarations()) {
      const info = await this.client.fetchRegistryInfo();
      const specifier = statement.getModuleSpecifier().getLiteralValue();

      if (info.switchables && specifier in info.switchables) {
        const switchable = info.switchables[specifier];
        statement.setModuleSpecifier(switchable.specifier);
        for (const member of statement.getNamedImports()) {
          const name = member.getName();

          if (name in switchable.members) {
            member.setName(switchable.members[name]);
          }
        }
      }
    }

    return sourceFile.getFullText();
  }

  private resolveOutputPath(ref: File): string {
    const config = this.client.config;
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
    if (ref.target) {
      return path.join(config.baseDir, ref.target.replace('<dir>', dir));
    }

    return path.join(config.baseDir, dir, path.basename(ref.path));
  }
}
