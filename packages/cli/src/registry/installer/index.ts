import path from 'node:path';
import fs from 'node:fs/promises';
import { confirm, isCancel, log, outro } from '@clack/prompts';
import { createEmptyProject } from '@/utils/typescript';
import { typescriptExtensions } from '@/constants';
import { toImportSpecifier } from '@/utils/ast';
import type { Component, File } from '@/registry/schema';
import { HttpRegistryClient, type RegistryClient } from '@/registry/client';
import { x } from 'tinyexec';
import { DependencyManager } from '@/registry/installer/dep-manager';
import { AsyncCache } from '@/utils/cache';
import type { SourceFile } from 'ts-morph';

interface DownloadedComponent extends Omit<Component, 'subComponents'> {
  variables?: Record<string, unknown>;
}

export interface ComponentInstallerPlugin {
  transform?: (context: {
    file: SourceFile;
    componentFile: File;
    component: DownloadedComponent;
  }) => void | Promise<void>;
}

export class ComponentInstaller {
  private readonly project = createEmptyProject();
  private readonly installedFiles = new Set<string>();
  private readonly downloadCache = new AsyncCache<DownloadedComponent[]>();
  readonly dependencies: Record<string, string | null> = {};
  readonly devDependencies: Record<string, string | null> = {};

  constructor(
    private readonly rootClient: RegistryClient,
    private readonly plugins: ComponentInstallerPlugin[] = [],
  ) {}

  async install(name: string) {
    let downloaded: DownloadedComponent[];
    // detect linked registry
    const info = await this.rootClient.fetchRegistryInfo();

    for (const registry of info.registries ?? []) {
      if (name.startsWith(`${registry}/`)) {
        downloaded = await this.download(
          name.slice(registry.length + 1),
          this.rootClient.createLinkedRegistryClient(registry),
        );
        break;
      }
    }

    downloaded ??= await this.download(name, this.rootClient);

    for (const item of downloaded) {
      Object.assign(this.dependencies, item.dependencies);
      Object.assign(this.devDependencies, item.devDependencies);
    }

    for (const comp of downloaded) {
      for (const file of comp.files) {
        const outPath = this.resolveOutputPath(file);
        if (this.installedFiles.has(outPath)) continue;
        this.installedFiles.add(outPath);

        const output = typescriptExtensions.includes(path.extname(outPath))
          ? await this.transform(name, file, comp, downloaded)
          : file.content;

        const status = await fs
          .readFile(outPath)
          .then((res) => {
            if (res.toString() === output) return 'ignore';
            return 'need-update';
          })
          .catch(() => 'write');

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
  }

  async installDeps() {
    await new DependencyManager().installDeps(
      this.dependencies,
      this.devDependencies,
    );
  }

  async onEnd() {
    const config = this.rootClient.config;
    if (config.commands.format) {
      await x(config.commands.format);
    }
  }

  /**
   * return a list of components, merged with child components & variables.
   */
  private async download(
    name: string,
    client: RegistryClient,
    contextVariables?: Record<string, unknown>,
  ): Promise<DownloadedComponent[]> {
    const hash = `${client.registryId} ${name}`;
    const info = await client.fetchRegistryInfo();
    const variables = { ...contextVariables, ...info.env };
    for (const [k, v] of Object.entries(info.variables ?? {})) {
      variables[k] ??= v.default;
    }

    const out = await this.downloadCache.cached(hash, async () => {
      const comp = await client.fetchComponent(name);
      const result: DownloadedComponent[] = [comp];
      // place it before downloading child components to avoid recursive downloads
      this.downloadCache.store.set(hash, result);

      const child = await Promise.all(
        comp.subComponents.map((sub) => {
          if (typeof sub === 'string') return this.download(sub, client);
          const baseUrl =
            this.rootClient instanceof HttpRegistryClient
              ? new URL(sub.baseUrl, `${this.rootClient.baseUrl}/`).href
              : sub.baseUrl;

          return this.download(
            sub.component,
            new HttpRegistryClient(baseUrl, client.config),
            variables,
          );
        }),
      );
      for (const sub of child) result.push(...sub);
      return result;
    });

    return out.map((file) => ({ ...file, variables }));
  }

  private readonly pathToFileCache = new AsyncCache<Map<string, File>>();
  private async transform(
    taskId: string,
    file: File,
    component: DownloadedComponent,
    allComponents: DownloadedComponent[],
  ): Promise<string> {
    const filePath = this.resolveOutputPath(file);
    const sourceFile = this.project.createSourceFile(filePath, file.content, {
      overwrite: true,
    });

    // transform alias
    const prefix = '@/';
    const variables = Object.entries(component.variables ?? {});
    const pathToFile = await this.pathToFileCache.cached(taskId, () => {
      const map = new Map<string, File>();
      for (const comp of allComponents) {
        for (const file of comp.files) map.set(file.target ?? file.path, file);
      }
      return map;
    });
    for (const specifier of sourceFile.getImportStringLiterals()) {
      for (const [k, v] of variables) {
        specifier.setLiteralValue(
          specifier.getLiteralValue().replaceAll(`<${k}>`, v as string),
        );
      }

      if (specifier.getLiteralValue().startsWith(prefix)) {
        const lookup = specifier.getLiteralValue().substring(prefix.length);
        const target = pathToFile.get(lookup);

        if (target) {
          specifier.setLiteralValue(
            toImportSpecifier(filePath, this.resolveOutputPath(target)),
          );
        } else {
          console.warn(`cannot find the referenced file of ${specifier}`);
        }
      }
    }

    for (const plugin of this.plugins) {
      await plugin.transform?.({
        file: sourceFile,
        componentFile: file,
        component,
      });
    }

    return sourceFile.getFullText();
  }

  private resolveOutputPath(file: File): string {
    const config = this.rootClient.config;
    const dir = (
      {
        components: config.aliases.componentsDir,
        block: config.aliases.blockDir,
        ui: config.aliases.uiDir,
        css: config.aliases.cssDir,
        lib: config.aliases.libDir,
        route: './',
      } as const
    )[file.type];
    if (file.target) {
      return path.join(config.baseDir, file.target.replace('<dir>', dir));
    }

    return path.join(config.baseDir, dir, path.basename(file.path));
  }
}
