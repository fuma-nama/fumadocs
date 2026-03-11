import { TemplatePlugin, TemplatePluginContext } from '@/index';
import { ComponentInstaller } from '@fumadocs/cli/registry/installer';
import { getDefaultConfig } from '@fumadocs/cli/config';
import { HttpRegistryClient } from '@fumadocs/cli/registry/client';
import { createSourceFile } from '@/transform/shared';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SyntaxKind } from 'ts-morph';

export function nextUseAi(provider: 'openrouter' | 'inkeep'): TemplatePlugin {
  return {
    async afterWrite() {
      if (this.template.value === '+next+fuma-docs-mdx') {
        const config = await getDefaultConfig();
        await install(
          `ai/${provider}`,
          new ComponentInstaller(new HttpRegistryClient('https://fumadocs.dev/registry', config), {
            cwd: this.dest,
          }),
        );
        await addAIChat(this);
        await fs.writeFile(
          path.join(this.dest, '.env.local'),
          provider === 'openrouter' ? 'OPENROUTER_API_KEY=' : 'INKEEP_API_KEY=',
        );
      }
    },
  };
}

async function install(target: string, installer: ComponentInstaller) {
  try {
    await installer.install(target, {
      onWarn() {},
      async confirmFileOverride() {
        return true;
      },
      onFileDownloaded() {},
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(-1);
  }

  const deps = await installer.deps();
  if (deps.hasRequired()) await deps.installRequired();
  await installer.onEnd();
}

async function addAIChat({ appDir }: TemplatePluginContext) {
  const file = await createSourceFile(path.join(appDir, 'app/layout.tsx'));
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
    if (opening?.getTagNameNode().getText() !== 'body') continue;

    const prior = element
      .getJsxChildren()
      .map((child) => child.print().trim())
      .join('\n');
    element.setBodyText(`${code}\n\n${prior}`);
    break;
  }

  file.addImportDeclaration({
    moduleSpecifier: '@/components/ai/search',
    namedImports: ['AISearch', 'AISearchPanel', 'AISearchTrigger'],
  });
  file.addImportDeclaration({
    moduleSpecifier: 'lucide-react',
    namedImports: ['MessageCircleIcon'],
  });
  file.addImportDeclaration({
    moduleSpecifier: 'fumadocs-ui/components/ui/button',
    namedImports: ['buttonVariants'],
  });

  await file.save();
}
