import type { TemplatePlugin } from '@/index';
import { HttpRegistryConnector } from 'fuma-cli/registry/connector';
import { getDefaultConfig } from '@fumadocs/cli/config';
import { type Feature, runFeature } from '@fumadocs/cli/features';
import { loadProject } from '@fumadocs/cli/project';
import { depVersions } from '@/constants';

/** apply a Fumadocs CLI feature to the generated project */
export function feature<O extends object>(feature: Feature<O>, options: O): TemplatePlugin {
  return {
    async afterWrite() {
      const config = await getDefaultConfig(this.dest);
      const project = await loadProject(config, this.dest);

      await runFeature(feature, options, {
        project,
        connector: new HttpRegistryConnector('https://fumadocs.dev/registry'),
        versions: depVersions,
        io: { log: this.log, installDependencies: false, confirmOverwrite: async () => true },
      });
    },
  };
}
