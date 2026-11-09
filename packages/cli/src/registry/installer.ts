import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import {
  autocompleteMultiselect,
  box,
  confirm,
  log,
  outro,
  spinner,
  type Option,
  type SpinnerResult,
} from '@clack/prompts';
import { detectPackageManager } from 'fuma-cli/detect';
import {
  ComponentInstaller,
  reuseUI,
  type InstallerPlugin,
  type InstallTarget,
  type IOInterface,
} from 'fuma-cli/registry/installer';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { UIRegistries } from '@/commands/shared';
import type { LoadedConfig } from '@/config';
import { formatRoute } from '@/project/route';
import { isCancel } from '@/utils/prompt';

export class FumadocsComponentInstaller extends ComponentInstaller {
  /** the component being installed by `installInteractive()` */
  private interactive: { name: string; spin: SpinnerResult } | null = null;

  constructor(
    connector: RegistryConnector,
    config: LoadedConfig,
    cwd?: string,
    io?: Partial<IOInterface>,
  ) {
    const { aliases } = config;
    const toRelative = (file: string) => path.relative(cwd ?? process.cwd(), file);

    super(connector, {
      cwd,
      io: {
        confirmFileOverride: async (file) => {
          if (!this.interactive) return true;
          const { name, spin } = this.interactive;
          spin.clear();
          const value = await confirm({
            message: `Do you want to override ${toRelative(file.output)}?`,
            initialValue: false,
          });
          if (isCancel(value)) {
            outro('Installation terminated');
            process.exit(0);
          }
          spin.start(styleText(['bold', 'cyanBright'], `Installing ${name}`));
          return value;
        },
        onFileWritten: (file) => {
          this.interactive?.spin.message(toRelative(file.output));
        },
        ...io,
      },
      framework: config.framework === 'astro' ? 'none' : config.framework,
      outDir: {
        base: config.baseDir,
        components: aliases.componentsDir,
        css: aliases.cssDir,
        layout: aliases.layoutDir,
        lib: aliases.libDir,
        ui: aliases.uiDir,
      },
      // other registries are compiled against Radix UI
      registryAliases: { [UIRegistries['radix-ui']]: UIRegistries[config.uiLibrary] },
      // `components/ui/*` follow the API of Shadcn UI, reuse the ones of project along with its `cn`
      plugins: [
        reuseUI({ files: aliases.utils ? { 'utils/cn.ts': aliases.utils } : undefined }),
        baseUIPackage(),
        ...(config.framework === 'astro' ? [astroEndpoints()] : []),
      ],
    });
  }

  /** select components of the root registry and `subRegistries` to install */
  async add(config: { subRegistries?: string[] } = {}) {
    const { subRegistries = [] } = config;
    const spin = spinner();
    spin.start('fetching registry');

    const scan = async (registry?: string) => {
      const options: Option<InstallTarget>[] = [];
      for (const item of (await this.fetchManifest(registry)).components) {
        if (item.unlisted) continue;
        options.push({
          label: item.title ?? item.name,
          value: { name: item.name, registry },
          hint: item.description,
        });
      }
      return options;
    };

    const options = (await Promise.all([scan(), ...subRegistries.map(scan)])).flat();
    spin.stop(styleText(['bold', 'greenBright'], 'registry fetched'));
    const value = await autocompleteMultiselect({
      message: 'Select components to install',
      options,
    });
    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    for (const target of value) await this.installInteractive(target.name, target.registry);
    outro(styleText(['bold', 'greenBright'], 'Successful'));
  }

  /** install with a spinner, and prompt for overrides and new dependencies */
  async installInteractive(name: string, registry?: string): Promise<void> {
    if (this.interactive) throw new Error(`cannot install while installing another component`);

    const spin = spinner();
    spin.start(styleText(['bold', 'cyanBright'], `Installing ${name}`));

    try {
      this.interactive = { name, spin };
      const deps = await (await this.install(name, registry)).deps();
      spin.stop(styleText(['bold', 'greenBright'], `${name} installed`));
      if (!deps.hasRequired()) return;

      log.message();
      box([...deps.dependencies, ...deps.devDependencies].join('\n'), 'New Dependencies');
      const pm = (await detectPackageManager())?.name ?? 'npm';
      const value = await confirm({ message: `Do you want to install with ${pm}?` });
      if (isCancel(value)) {
        outro('Installation terminated');
        process.exit(0);
      }

      if (value) {
        const spin = spinner({ errorMessage: 'Failed to install dependencies' });
        spin.start('Installing dependencies');
        await deps.installRequired(pm);
        spin.stop('Dependencies installed');
      } else {
        await deps.writeRequired();
      }
    } catch (e) {
      spin.error(e instanceof Error ? e.message : String(e));
      process.exit(-1);
    } finally {
      this.interactive = null;
    }
  }
}

/**
 * Projects install Base UI as `fumadocs-ui`, which other registries import. Its registry is compiled under the real package name, a second dependency on it would duplicate the package.
 */
function baseUIPackage(): InstallerPlugin {
  return {
    name: 'base-ui-package',
    resolveId({ info: { dependencies } }) {
      if (dependencies && '@fumadocs/base-ui' in dependencies) {
        delete dependencies['@fumadocs/base-ui'];
        dependencies['fumadocs-ui'] = 'npm:@fumadocs/base-ui';
      }
    },
    transform: (code) => code.replaceAll(`'@fumadocs/base-ui/`, `'fumadocs-ui/`),
  };
}

/**
 * Route handlers are generated as framework-agnostic `METHOD(request)` functions on Astro, turn them into endpoints of `src/pages`.
 */
function astroEndpoints(): InstallerPlugin {
  return {
    name: 'astro-endpoints',
    resolveId(file) {
      if (file.info.type === 'route-handler')
        return {
          id: path.join(
            this.baseDir,
            formatRoute({ segments: [file.info.route] }, 'astro', null).file,
          ),
        };
    },
    async writeBundle(files) {
      for (const file of files) {
        if (file.info.type !== 'route-handler' || typeof file.content !== 'string') continue;
        const code = file.content
          .replaceAll(
            /export async function (\w+)\((\w+): Request\)/g,
            'export async function $1({ request: $2 }: APIContext)',
          )
          // `import.meta.env` is inlined at build time, `getSecret()` reads secrets at runtime
          .replaceAll(/process\.env\.(\w+)/g, "getSecret('$1')");
        await fs.writeFile(
          file.output,
          `import type { APIContext } from 'astro';
import { getSecret } from 'astro:env/server';
${code}
// rendered on request, it needs an adapter
export const prerender = false;
`,
        );
      }
    },
  };
}
