import type { TemplatePlugin } from '@/index';
import { HttpRegistryConnector } from 'fuma-cli/registry/connector';
import { getDefaultConfig } from '@fumadocs/cli/config';
import { runFeature } from '@fumadocs/cli/features';
import { ai as aiFeature, type AIProvider } from '@fumadocs/cli/features/ai';
import { loadProject } from '@fumadocs/cli/project';

export function ai(provider: AIProvider): TemplatePlugin {
  return {
    async afterWrite() {
      const config = await getDefaultConfig(this.dest);
      const project = await loadProject(config, this.dest);

      await runFeature(
        aiFeature,
        { provider },
        {
          project,
          connector: new HttpRegistryConnector('https://fumadocs.dev/registry'),
          io: { log: this.log, installDependencies: false, confirmOverwrite: async () => false },
        },
      );
    },
  };
}
