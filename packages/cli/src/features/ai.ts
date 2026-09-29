import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import { findSource } from './utils';
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
    if (ctx.project.source.dynamic) await readDynamicSource(ctx);

    const { cwd, baseDir, info } = ctx.project;
    const layout = await findSource(cwd, path.join(baseDir, info.routesDir), '<DocsLayout');
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

/** the installed chat route indexes pages of a static `source`, runtime sources resolve on demand */
async function readDynamicSource(ctx: FeatureContext) {
  const { cwd, baseDir } = ctx.project;
  const route = await findSource(cwd, baseDir, 'createSearchServer');
  const edited =
    route !== undefined &&
    (await ctx.source(route, (file) => {
      file.s.replaceAll(
        "import { source } from '@/lib/source';",
        "import { getSource } from '@/lib/source';",
      );
      file.s.replaceAll('source.getPages()', '(await getSource()).getPages()');
      // every page of a runtime source carries its Markdown
      file.s.replaceAll("      if (!('getText' in page.data)) return null;\n\n", '');
      file.s.replaceAll("await page.data.getText('processed')", 'page.data.content');
    }));

  if (!edited)
    ctx.note(
      'Read pages from `getSource()` in the chat route, the search index is built from `page.data.content`.',
    );
}
