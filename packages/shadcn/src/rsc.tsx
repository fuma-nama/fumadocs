import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
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
      return 'tailwind.config';
  }
}

export async function Snippet({ item }: { item: ManualInstallationSnippet }) {
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
              <ServerCodeBlock code={v} lang={item.lang} />
            </CodeBlockTab>
          ))}
        </CodeBlockTabs>
      );
  }

  const title = getTitle(item);

  return (
    <ServerCodeBlock
      code={item.code}
      lang={item.lang}
      codeblock={{ title }}
      transformers={transformers}
    />
  );
}
