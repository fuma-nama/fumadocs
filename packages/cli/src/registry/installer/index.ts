import path from 'node:path';
import fs from 'node:fs/promises';
import { typescriptExtensions } from '@/constants';
import { toImportSpecifier, transformSpecifiers } from '@/utils/ast';
import type { Component, File } from '@/registry/schema';
import { HttpRegistryClient, type RegistryClient } from '@/registry/client';
import { x } from 'tinyexec';
import { createDeps } from '@/registry/installer/dep-manager';
import { createCache } from '@/utils/cache';
import { parse } from 'oxc-parser';
import MagicString from 'magic-string';
import { decodeImport, encodeImport } from '../protocols/import';
import type { Awaitable } from '@/types';
import { transformRouteHandler } from '@/registry/macros/route-handler.build';
import {
  addReactRouterRouteToFile,
  resolveReactRouterRoute,
  resolveRouteFilePath,
} from '@/utils/framework';

interface PluginContext {
  installer: ComponentInstaller;
}

interface TransformContext extends PluginContext, InstallContext {
  file: File;
  filePath: string;
  component: DownloadedComponent;
}

interface InstallContext {
  io: IOInterface;
  importLookup: Map<string, File>;
  /** full variables of the current component. */
  $variables: Record<string, unknown>;
  /** the last item is always the current component. */
  stack: DownloadedComponent[];
}

interface DownloadedComponent extends Component {
  $subComponents: DownloadedComponent[];
  $registry: RegistryClient;
}

export interface ComponentInstallerPlugin {
  transform?: (file: string, context: TransformContext) => Awaitable<string>;
  transformImport?: (specifier: string, context: TransformContext) => string;

  /**
   * transform component before install
   */
  beforeInstall?: (
    comp: DownloadedComponent,
    context: InstallContext & PluginContext,
  ) => Awaitable<DownloadedComponent | undefined>;

  beforeDownload?: (
    context: PluginContext & {
      name: string;
    },
  ) => void | Promise<void>;

  afterDownload?: (
    context: PluginContext & {
      name: string;
      result: DownloadedComponent;
    },
  ) => void | Promise<void>;
}

export interface IOInterface {
  onWarn: (message: string) => void;
  confirmFileOverride: (options: { path: string }) => Promise<boolean>;
  onFileDownloaded: (options: { path: string; file: File; component: Component }) => void;
}

export interface ComponentInstallerOptions {
  plugins?: ComponentInstallerPlugin[];
  cwd?: string;
}

export class ComponentInstaller {
  private readonly installedFiles = new Set<string>();
  private readonly downloadCache = createCache<DownloadedComponent>();
  private readonly cwd: string;
  private readonly plugins: ComponentInstallerPlugin[];
  readonly dependencies: Record<string, string | null> = {};
  readonly devDependencies: Record<string, string | null> = {};

  constructor(
    private readonly rootClient: RegistryClient,
    options: ComponentInstallerOptions = {},
  ) {
    this.cwd = options.cwd ?? process.cwd();
    this.plugins = options.plugins ?? [];
  }

  private async installComponent(comp: DownloadedComponent, ctx: InstallContext) {
    // avoid circular refs
    if (ctx.stack.indexOf(comp) !== ctx.stack.length - 1) return;

    const pluginCtx = { installer: this, ...ctx };
    for (const plugin of this.plugins) {
      comp = (await plugin.beforeInstall?.(comp, pluginCtx)) ?? comp;
    }

    Object.assign(this.dependencies, comp.dependencies);
    Object.assign(this.devDependencies, comp.devDependencies);

    for (const file of comp.files) {
      const outPath = this.resolveOutputPath(file);
      if (this.installedFiles.has(outPath)) continue;
      this.installedFiles.add(outPath);

      const output = typescriptExtensions.includes(path.extname(outPath))
        ? await this.transform(file, comp, ctx)
        : file.content;

      const status = await fs
        .readFile(outPath)
        .then((res) => {
          if (res.toString().trim() === output.trim()) return 'ignore';
          return 'need-update';
        })
        .catch(() => 'write');

      if (status === 'ignore') continue;

      if (status === 'need-update') {
        const override = await ctx.io.confirmFileOverride({ path: outPath });
        if (!override) continue;
      }

      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, output);
      ctx.io.onFileDownloaded({ path: outPath, file, component: comp });
    }

    for (const child of comp.$subComponents) {
      const stack = [...ctx.stack, child];
      const variables = { ...ctx.$variables };
      if (child.$registry.registryId !== comp.$registry.registryId) {
        const info = await child.$registry.fetchRegistryInfo();
        Object.assign(variables, info.variables);
      }
      Object.assign(variables, child.variables);

      await this.installComponent(child, { ...ctx, stack, $variables: variables });
    }
  }

  async install(name: string, io: IOInterface) {
    let downloaded: DownloadedComponent;
    // detect linked registry
    const rootInfo = await this.rootClient.fetchRegistryInfo();
    const registry = rootInfo.registries?.find((registry) => name.startsWith(`${registry}/`));

    if (registry) {
      downloaded = await this.download(
        name.slice(registry.length + 1),
        this.rootClient.createLinkedRegistryClient(registry),
      );
    } else {
      downloaded = await this.download(name, this.rootClient);
    }

    const allComponents = new Set<DownloadedComponent>();
    function scan(comp: DownloadedComponent) {
      if (allComponents.has(comp)) return;

      allComponents.add(comp);
      for (const child of comp.$subComponents) scan(child);
    }

    scan(downloaded);

    const importLookup = new Map<string, File>();
    for (const comp of allComponents) {
      for (const file of comp.files) {
        importLookup.set(encodeImport(file), file);
      }
    }

    const info = await downloaded.$registry.fetchRegistryInfo();
    await this.installComponent(downloaded, {
      importLookup,
      io,
      $variables: { ...info.env, ...downloaded.variables },
      stack: [downloaded],
    });
  }

  deps() {
    return createDeps(this.cwd, this.dependencies, this.devDependencies);
  }

  async onEnd() {
    const config = this.rootClient.config;
    if (config.commands.format) {
      await x(config.commands.format);
    }
  }

  /**
   * download component & its sub components
   */
  private async download(name: string, client: RegistryClient): Promise<DownloadedComponent> {
    return this.downloadCache.cached(
      JSON.stringify([client.registryId, name]),
      async (presolve) => {
        for (const plugin of this.plugins) {
          await plugin.beforeDownload?.({
            installer: this,
            name,
          });
        }

        const comp = await client.fetchComponent(name);
        const result: DownloadedComponent = {
          ...comp,
          $registry: client,
          $subComponents: [],
        };
        // place it before downloading child components to avoid recursive downloads
        presolve(result);

        result.$subComponents = await Promise.all(
          comp.subComponents.map((sub) => {
            if (typeof sub === 'string') return this.download(sub, client);

            let subClient: RegistryClient;
            if (this.rootClient instanceof HttpRegistryClient) {
              const baseUrl = new URL(sub.baseUrl, `${this.rootClient.baseUrl}/`).href;
              subClient =
                client instanceof HttpRegistryClient && client.baseUrl === baseUrl
                  ? client
                  : new HttpRegistryClient(baseUrl, client.config);
            } else {
              subClient = new HttpRegistryClient(sub.baseUrl, client.config);
            }

            return this.download(sub.component, subClient);
          }),
        );

        for (const plugin of this.plugins) {
          await plugin.afterDownload?.({
            installer: this,
            name,
            result,
          });
        }

        return result;
      },
    );
  }

  private async transform(
    file: File,
    component: DownloadedComponent,
    ctx: InstallContext,
  ): Promise<string> {
    const filePath = this.resolveOutputPath(file);
    const transformCtx: TransformContext = { installer: this, file, filePath, component, ...ctx };
    let transformed = await this.defaultTransform(file.content, transformCtx);

    for (const plugin of this.plugins) {
      if (!plugin.transform) continue;
      transformed = await plugin.transform(transformed, transformCtx);
    }

    return transformed;
  }

  private async defaultTransform(content: string, ctx: TransformContext) {
    const { file, importLookup, filePath, $variables, io } = ctx;
    const config = this.rootClient.config;
    const parsed = await parse(filePath, content);
    const s = new MagicString(content);

    transformSpecifiers(parsed.program, s, (specifier) => {
      for (const plugin of this.plugins) {
        if (plugin.transformImport) {
          specifier = plugin.transformImport(specifier, ctx);
        }
      }

      if (importLookup.has(specifier)) {
        let outputPath = this.resolveOutputPath(importLookup.get(specifier)!);

        for (const [k, v] of Object.entries($variables)) {
          if (typeof v === 'string') outputPath = outputPath.replaceAll(`<${k}>`, v);
        }

        return toImportSpecifier(filePath, outputPath);
      }

      const decoded = decodeImport(specifier);
      if ('raw' in decoded) {
        return decoded.raw;
      }

      io.onWarn(`cannot find the referenced file of ${specifier}`);
      return specifier;
    });

    if (file.type === 'route-handler') {
      transformRouteHandler(file.route, filePath, config.framework, parsed.program, s);

      if (config.framework === 'react-router') {
        const routesFile = path.join(this.cwd, 'app/routes.ts');
        const content = await fs
          .readFile(routesFile, 'utf-8')
          .then((res) => res.toString())
          .catch(() => null);

        if (content)
          await addReactRouterRouteToFile(routesFile, content, {
            path: resolveReactRouterRoute(file.route),
            module: path.relative(path.dirname(routesFile), filePath),
          });
      }
    }

    return s.toString();
  }

  private resolveOutputPath(file: File): string {
    const config = this.rootClient.config;
    if (file.type === 'route-handler') {
      const rel = resolveRouteFilePath(file.route, config.framework, 'ts');
      return path.resolve(this.cwd, config.baseDir, rel);
    }

    const dir = (
      {
        components: config.aliases.componentsDir,
        ui: config.aliases.uiDir,
        css: config.aliases.cssDir,
        lib: config.aliases.libDir,
        layout: config.aliases.layoutDir,
      } as const
    )[file.type];
    if (file.target) {
      return path.resolve(this.cwd, config.baseDir, file.target.replace('<dir>', dir));
    }

    return path.resolve(this.cwd, config.baseDir, dir, path.basename(file.path));
  }
}
