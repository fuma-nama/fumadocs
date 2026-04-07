import { ComponentInstaller } from 'fuma-cli/registry/installer';
import { pluginPreserveLayouts } from './plugins/preserve';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import type { LoadedConfig } from '@/config';
import { confirm, isCancel, outro, SpinnerResult } from '@clack/prompts';
import picocolors from 'picocolors';

export class FumadocsComponentInstaller extends ComponentInstaller {
  installing?: {
    name: string;
    spin: SpinnerResult;
  };

  constructor(connector: RegistryConnector, config: LoadedConfig) {
    super(connector, {
      framework: config.framework,
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
          this.installing?.spin.message(message);
        },
        confirmFileOverride: async (options) => {
          if (!this.installing) return true;
          const { name, spin } = this.installing;
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
          this.installing?.spin.message(options.path);
        },
      },
      plugins: [pluginPreserveLayouts()],
    });
  }
}
