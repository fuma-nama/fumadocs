import { InteractiveInstaller } from '@fuma-cli/interactive';
import { reuseUI, type IOInterface } from 'fuma-cli/registry/installer';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { UIRegistries } from '@/commands/shared';
import type { LoadedConfig } from '@/config';

export class FumadocsComponentInstaller extends InteractiveInstaller {
  constructor(
    connector: RegistryConnector,
    config: LoadedConfig,
    cwd?: string,
    io?: Partial<IOInterface>,
  ) {
    const { aliases } = config;

    super(connector, {
      cwd,
      io,
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
      plugins: [reuseUI({ files: aliases.utils ? { 'utils/cn.ts': aliases.utils } : undefined })],
    });
  }
}
