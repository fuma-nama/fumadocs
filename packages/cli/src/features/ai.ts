import path from 'node:path';
import type { ImportDeclaration } from 'oxc-parser';
import type { Feature, FeatureContext } from '@/features';
import { exists } from '@/utils/fs';
import { findCssEntry, findSource } from './utils';
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

    const { cwd, baseDir, info, config } = ctx.project;
    // e.g. `./components` -> `@/components/ai/layout`
    const clientLayoutImport = `@/${path.posix.join(config.aliases.componentsDir, 'ai/layout')}`;
    const layout = await findSource(cwd, path.join(baseDir, info.routesDir), '<DocsLayout');
    let layoutModule: string | undefined;
    let wired = false;

    if (layout !== undefined) {
      await ctx.source(layout, (file) => {
        wired = file.code.includes(`'${clientLayoutImport}'`);
        // `aiChat` takes client state, render the layout from a client component
        const declaration =
          !wired &&
          file.program.body.find(
            (node): node is ImportDeclaration =>
              node.type === 'ImportDeclaration' &&
              node.importKind !== 'type' &&
              /^fumadocs-ui\/layouts\/(docs|notebook|glass|spacious)$/.test(node.source.value) &&
              node.specifiers.length === 1 &&
              node.specifiers[0].local.name === 'DocsLayout',
          );
        if (!declaration) return;

        layoutModule = declaration.source.value;
        file.s.overwrite(
          declaration.source.start,
          declaration.source.end,
          `'${clientLayoutImport}'`,
        );
      });
    }

    if (layoutModule) {
      await ctx.write(
        path.join(baseDir, config.aliases.componentsDir, 'ai/layout.tsx'),
        clientLayout(layoutModule),
      );
    } else if (!wired) {
      ctx.note(
        'Pass the AI chat to your docs layout, see https://fumadocs.dev/docs/integrations/llms#ask-ai.',
      );
    }
    const css = await findCssEntry(ctx.project);
    if (css && (await exists(path.join(cwd, css)))) await ctx.append(css, [cssImport]);
    else ctx.note(`Add the chat styles to your global CSS file:\n  ${cssImport}`);

    ctx.note(`Set ${providers[provider].env} in \`.env.local\`.`);
  },
};

const cssImport = `@import '@fumadocs/ai-chat/css/preset.css';`;

const floatingTrigger = `
      <AISearchTrigger
        position="float"
        className={buttonVariants({
          variant: 'secondary',
          className: 'text-fd-muted-foreground rounded-2xl',
        })}
      >
        <MessageCircleIcon className="size-4.5" />
        Ask AI
      </AISearchTrigger>`;

/** a client component rendering the docs layout with the installed chat */
function clientLayout(layoutModule: string) {
  // Glass and Spacious layouts have their own trigger
  const trigger = /\/(docs|notebook)$/.test(layoutModule);

  return `'use client';
import { DocsLayout as Layout, type DocsLayoutProps } from '${layoutModule}';
${
  trigger
    ? `import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { MessageCircleIcon } from 'lucide-react';
`
    : ''
}import {
  AISearch,
  AISearchPanel,${trigger ? '\n  AISearchTrigger,' : ''}
  useAISearchContext,
  useHotKey,
} from './search';

export function DocsLayout(props: DocsLayoutProps) {
  return (
    <AISearch>
      <ChatLayout {...props} />${trigger ? floatingTrigger : ''}
    </AISearch>
  );
}

function ChatLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

  return <Layout {...props} aiChat={{ open, onOpenChange: setOpen, panel: <AISearchPanel /> }} />;
}
`;
}

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
