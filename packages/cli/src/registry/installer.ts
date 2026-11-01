import fs from 'node:fs/promises';
import path from 'node:path';
import { InteractiveInstaller } from '@fuma-cli/interactive';
import { reuseUI, type InstallerPlugin, type IOInterface } from 'fuma-cli/registry/installer';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { UIRegistries } from '@/commands/shared';
import type { LoadedConfig } from '@/config';
import { formatRoute } from '@/project/route';

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
      plugins: [
        reuseUI({ files: aliases.utils ? { 'utils/cn.ts': aliases.utils } : undefined }),
        ...(config.framework === 'astro' ? [astroEndpoints()] : []),
      ],
    });
  }
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
