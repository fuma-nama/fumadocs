import { ComponentInstaller, type IOInterface } from 'fuma-cli/registry/installer';
import { pluginPreserveLayouts } from './plugins/preserve';
import { pluginReuseUI } from './plugins/shadcn';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { UIRegistries } from '@/commands/shared';
import type { LoadedConfig } from '@/config';
import { box, confirm, log, outro, spinner, SpinnerResult } from '@clack/prompts';
import { isCancel } from '@/utils/prompt';
import picocolors from 'picocolors';
import { detectPackageManager } from 'fuma-cli/detect';

const uiRegistries = new Set(Object.values(UIRegistries));

/** components are compiled against one UI library, fetch them from the sub-registry of the configured one */
class UILibraryConnector implements RegistryConnector {
  readonly id: string;

  constructor(
    private readonly base: RegistryConnector,
    private readonly ui: string,
  ) {
    this.id = base.id;
  }

  private resolve(subRegistry?: string) {
    return subRegistry && uiRegistries.has(subRegistry) ? this.ui : subRegistry;
  }

  fetchRegistryInfo(subRegistry?: string) {
    return this.base.fetchRegistryInfo(this.resolve(subRegistry));
  }

  fetchComponent(name: string, subRegistry?: string) {
    return this.base.fetchComponent(name, this.resolve(subRegistry));
  }

  hasComponent(name: string, subRegistry?: string) {
    return this.base.hasComponent(name, this.resolve(subRegistry));
  }
}

export class FumadocsComponentInstaller extends ComponentInstaller {
  private interactive: {
    name: string;
    spin: SpinnerResult;
  } | null = null;

  constructor(
    connector: RegistryConnector,
    config: LoadedConfig,
    cwd?: string,
    io?: Partial<IOInterface>,
  ) {
    super(new UILibraryConnector(connector, UIRegistries[config.uiLibrary]), {
      cwd,
      framework: config.framework === 'astro' ? 'none' : config.framework,
      outDir: {
        base: config.baseDir,
        components: config.aliases.componentsDir,
        css: config.aliases.cssDir,
        layout: config.aliases.layoutDir,
        lib: config.aliases.libDir,
        ui: config.aliases.uiDir,
      },
      io: {
        onWarn: (message) => {
          this.interactive?.spin.message(message);
        },
        confirmFileOverride: async (options) => {
          if (!this.interactive) return true;
          const { name, spin } = this.interactive;
          spin.clear();
          const value = await confirm({
            message: `Do you want to override ${options.path}?`,
            initialValue: false,
          });
          if (isCancel(value)) {
            outro('Installation terminated');
            process.exit(0);
          }
          spin.start(picocolors.bold(picocolors.cyanBright(`Installing ${name}`)));
          return value;
        },
        onFileDownloaded: (options) => {
          this.interactive?.spin.message(options.path);
        },
        ...io,
      },
      plugins: [pluginPreserveLayouts(), pluginReuseUI(config, cwd)],
    });
  }

  async installInteractive(name: string, subRegistry?: string): Promise<void> {
    if (this.interactive) {
      throw new Error(`cannot install while installing another component`);
    }

    const spin = spinner();
    spin.start(picocolors.bold(picocolors.cyanBright(`Installing ${name}`)));

    try {
      this.interactive = { name, spin };
      const deps = await super.install(name, subRegistry).then((res) => res.deps());
      spin.stop(picocolors.bold(picocolors.greenBright(`${name} installed`)));

      if (deps.hasRequired()) {
        log.message();
        box([...deps.dependencies, ...deps.devDependencies].join('\n'), 'New Dependencies');
        const pm = (await detectPackageManager())?.name ?? 'npm';
        const value = await confirm({
          message: `Do you want to install with ${pm}?`,
        });

        if (isCancel(value)) {
          outro('Installation terminated');
          process.exit(0);
        }

        if (value) {
          const spin = spinner({
            errorMessage: 'Failed to install dependencies',
          });
          spin.start('Installing dependencies');
          await deps.installRequired(pm);
          spin.stop('Dependencies installed');
        } else {
          await deps.writeRequired();
        }
      }
    } catch (e) {
      spin.error(e instanceof Error ? e.message : String(e));
      process.exit(-1);
    } finally {
      this.interactive = null;
    }
  }
}
