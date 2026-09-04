import { TemplatePlugin, TemplatePluginContext } from '@/index';
import {
  addImport,
  createSourceFile,
  findJsxElement,
  prependJsxChildren,
} from '@/transform/shared';
import path from 'node:path';
import fs from 'node:fs/promises';
import { FumadocsComponentInstaller } from '@fumadocs/cli/registry/installer';
import { HttpRegistryConnector } from 'fuma-cli/registry/connector';
import { getDefaultConfig } from '@fumadocs/cli/config';

const envKey: Record<'openrouter' | 'llmgateway' | 'inkeep', string> = {
  openrouter: 'OPENROUTER_API_KEY',
  llmgateway: 'LLM_GATEWAY_API_KEY',
  inkeep: 'INKEEP_API_KEY',
};

export function ai(provider: 'openrouter' | 'llmgateway' | 'inkeep'): TemplatePlugin {
  return {
    async afterWrite() {
      const config = await getDefaultConfig(this.dest);
      const installer = new FumadocsComponentInstaller(
        new HttpRegistryConnector('https://fumadocs.dev/registry'),
        config,
        this.dest,
      );

      try {
        const deps = await installer.install(`ai/${provider}`).then((res) => res.deps());
        if (deps.hasRequired()) await deps.writeRequired();

        await addAIChat(this);
        await fs.writeFile(path.join(this.dest, '.env.local'), `${envKey[provider]}=`);
      } catch (e) {
        console.error(e);
      }
    },
  };
}

async function addAIChat({ template, appDir }: TemplatePluginContext) {
  let filePath: string;
  switch (template.value) {
    case '+next+fuma-docs-mdx':
    case '+next+fuma-docs-mdx+static':
      filePath = path.join(appDir, 'app/docs/layout.tsx');
      break;
    case 'waku':
      filePath = path.join(appDir, 'pages/docs/_layout.tsx');
      break;
    case 'react-router':
    case 'react-router-spa':
      filePath = path.join(appDir, 'routes/docs.tsx');
      break;
    case 'tanstack-start':
    case 'tanstack-start-spa':
      filePath = path.join(appDir, 'routes/docs/$.tsx');
      break;
    case 'astro':
      filePath = path.join(appDir, 'components/docs.tsx');
      break;
  }

  const file = await createSourceFile(filePath);
  const code = `<AISearch>
  <AISearchPanel />
  <AISearchTrigger
    position="float"
    className={cn(
      buttonVariants({
        variant: 'secondary',
        className: 'text-fd-muted-foreground rounded-2xl',
      }),
    )}
  >
    <MessageCircleIcon className="size-4.5" />
    Ask AI
  </AISearchTrigger>
</AISearch>`;

  const layout = findJsxElement(file, 'DocsLayout');
  if (layout) prependJsxChildren(file, layout, code);

  addImport(file, {
    from: '@/components/ai/search',
    named: ['AISearch', 'AISearchPanel', 'AISearchTrigger'],
  });
  addImport(file, { from: 'lucide-react', named: ['MessageCircleIcon'] });
  addImport(file, { from: '@/lib/cn', named: ['cn'] });
  addImport(file, { from: 'fumadocs-ui/components/ui/button', named: ['buttonVariants'] });

  await file.save();
}
