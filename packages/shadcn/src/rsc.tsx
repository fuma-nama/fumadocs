import { createServerCodeBlock, ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Highlighter } from 'fumadocs-core/highlight';
import type { ShikiTransformer } from 'shiki';
import type { ManualInstallationSnippet } from './manual-installation';
import { transformerIcon } from 'fumadocs-core/mdx-plugins/transformer-icon';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { transformerNotationDiff } from '@shikijs/transformers';

const transformers = [transformerNotationDiff(), transformerIcon()];

function getTitle(item: ManualInstallationSnippet): string | undefined {
  switch (item.kind) {
    case 'file':
      return item.path;
    case 'cssVars':
    case 'css':
      return 'globals.css';
    case 'envVars':
      return '.env.local';
    case 'tailwind':
      return 'tailwind.config.js';
  }
}

export async function Snippet({ item }: { item: ManualInstallationSnippet }) {
  return renderSnippet(item, ServerCodeBlock);
}

/** Create a `Snippet` that highlights with your own highlighter, a function receives the transformers of `Snippet`. */
export function createSnippet({
  highlighter,
}: {
  highlighter: Highlighter | ((options: { transformers: ShikiTransformer[] }) => Highlighter);
}) {
  const CodeBlock = createServerCodeBlock({
    highlighter: typeof highlighter === 'function' ? highlighter({ transformers }) : highlighter,
  });

  return function Snippet({ item }: { item: ManualInstallationSnippet }) {
    return renderSnippet(item, CodeBlock);
  };
}

function renderSnippet(item: ManualInstallationSnippet, CodeBlock: typeof ServerCodeBlock) {
  if (item.kind === 'docs') {
    return <p className="text-fd-muted-foreground text-sm whitespace-pre-wrap">{item.content}</p>;
  }

  switch (item.kind) {
    case 'dependencies':
    case 'devDependencies':
    case 'registryDependencies':
      const tabs = Object.entries(item.codeTabs);

      return (
        <CodeBlockTabs defaultValue={tabs[0][0]}>
          <CodeBlockTabsList>
            {tabs.map(([t]) => (
              <CodeBlockTabsTrigger key={t} value={t}>
                {t}
              </CodeBlockTabsTrigger>
            ))}
          </CodeBlockTabsList>
          {tabs.map(([k, v]) => (
            <CodeBlockTab key={k} value={k}>
              <CodeBlock code={v} lang={item.lang} />
            </CodeBlockTab>
          ))}
        </CodeBlockTabs>
      );
  }

  const title = getTitle(item);

  return (
    // Shiki transformers, a code block of your own highlighter ignores them
    <CodeBlock
      code={item.code}
      lang={item.lang}
      codeblock={{ title }}
      transformers={transformers}
    />
  );
}
