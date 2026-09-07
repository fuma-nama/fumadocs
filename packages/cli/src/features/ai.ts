import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature } from '@/features';
import { addImport, findJsxElement, prependJsxChildren } from '@/codemod';
import { docs } from './docs';

const providers = {
  openrouter: { label: 'AI SDK', hint: 'default to OpenRouter', env: 'OPENROUTER_API_KEY' },
  llmgateway: {
    label: 'LLMGateway',
    hint: 'open-source LLM gateway, API key required',
    env: 'LLM_GATEWAY_API_KEY',
  },
  inkeep: { label: 'Inkeep AI', hint: 'API key required', env: 'INKEEP_API_KEY' },
};

export type AIProvider = keyof typeof providers;

export const ai: Feature<{ provider: AIProvider }> = {
  id: 'ai',
  title: 'AI Chat',
  description: 'Ask AI dialog for your docs',
  requires: [docs],
  options: {
    provider: {
      message: 'Choose an AI provider',
      choices: Object.entries(providers).map(([value, { label, hint }]) => ({
        value: value as AIProvider,
        label,
        hint,
      })),
    },
  },
  supports: (project) =>
    project.static ? 'AI chat requires a server to run the chat route handler.' : true,
  async apply(ctx, { provider }) {
    await ctx.install(`ai/${provider}`);
    ctx.env(providers[provider].env, '');

    const layout = await findDocsLayout(
      ctx.project.cwd,
      ctx.project.baseDir,
      ctx.project.info.routesDir,
    );
    const edited =
      layout !== undefined &&
      (await ctx.source(layout, (file) => {
        if (file.code.includes('<AISearch')) return;
        const element = findJsxElement(file, 'DocsLayout');
        if (!element) return;

        prependJsxChildren(
          file,
          element,
          `<AISearch>
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
</AISearch>`,
        );
        addImport(file, {
          from: '@/components/ai/search',
          named: ['AISearch', 'AISearchPanel', 'AISearchTrigger'],
        });
        addImport(file, { from: 'lucide-react', named: ['MessageCircleIcon'] });
        addImport(file, { from: '@/lib/cn', named: ['cn'] });
        addImport(file, { from: 'fumadocs-ui/components/ui/button', named: ['buttonVariants'] });
      }));

    if (!edited) {
      ctx.note(
        'Add `<AISearch>` from `@/components/ai/search` to your docs layout, see https://fumadocs.dev/docs/integrations/llms#ask-ai.',
      );
    }
    ctx.note(`Set ${providers[provider].env} in \`.env.local\`.`);
  },
};

/** the first file rendering `<DocsLayout` under the routes directory, relative to cwd */
async function findDocsLayout(cwd: string, baseDir: string, routesDir: string) {
  const dir = path.join(cwd, baseDir, routesDir);
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  entries.sort((a, b) => a.parentPath.length - b.parentPath.length);

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue;
    const file = path.join(entry.parentPath, entry.name);
    if ((await fs.readFile(file, 'utf-8')).includes('<DocsLayout')) return path.relative(cwd, file);
  }
}
