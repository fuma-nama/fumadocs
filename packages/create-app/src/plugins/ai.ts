import { TemplatePlugin, TemplatePluginContext } from '@/index';
import { createSourceFile } from '@/transform/shared';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SyntaxKind } from 'ts-morph';
import { FumadocsComponentInstaller } from '@fumadocs/cli/registry/installer';
import { HttpRegistryConnector } from 'fuma-cli/registry/connector';
import { getDefaultConfig } from '@fumadocs/cli/config';

export function ai(provider: 'openrouter' | 'inkeep'): TemplatePlugin {
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
        await fs.writeFile(
          path.join(this.dest, '.env.local'),
          provider === 'openrouter' ? 'OPENROUTER_API_KEY=' : 'INKEEP_API_KEY=',
        );
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
  }

  const file = await createSourceFile(filePath);
  const elements = file.getDescendantsOfKind(SyntaxKind.JsxElement);
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

  for (const element of elements) {
    const opening = element.getFirstChildByKind(SyntaxKind.JsxOpeningElement);
    if (opening?.getTagNameNode().getText() !== 'DocsLayout') continue;

    const prior = element
      .getJsxChildren()
      .map((child) => child.print().trim())
      .join('\n');
    element.setBodyText(`${code}\n\n${prior}`);
    break;
  }

  file.addImportDeclarations([
    {
      moduleSpecifier: '@/components/ai/search',
      namedImports: ['AISearch', 'AISearchPanel', 'AISearchTrigger'],
    },
    {
      moduleSpecifier: 'lucide-react',
      namedImports: ['MessageCircleIcon'],
    },
    {
      moduleSpecifier: '@/lib/cn',
      namedImports: ['cn'],
    },
    {
      moduleSpecifier: 'fumadocs-ui/components/ui/button',
      namedImports: ['buttonVariants'],
    },
  ]);

  await file.save();
}
