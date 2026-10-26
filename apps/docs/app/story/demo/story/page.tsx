import { readFile } from 'node:fs/promises';
import { ServerCodeBlock } from '@/components/server-codeblock';
import { story } from '@/content/docs/(framework)/integrations/story/client.story';

const DIR = 'content/docs/(framework)/integrations/story';

/**
 * The Callout story of the docs with its controls, and how its page renders it; the file that
 * defines it beside them once there is room.
 */
export default async function Page() {
  const [definition, page] = await Promise.all([
    readFile(`${DIR}/client.story.tsx`, 'utf8'),
    readFile(`${DIR}/index.mdx`, 'utf8'),
  ]);
  // the lines at the top of the docs page that import the story and render it
  const usage: string[] = [];
  for (const line of page.split('\n')) {
    if (line.startsWith('#')) break;
    if (line.startsWith('import { story }') || line.startsWith('<story.WithControl'))
      usage.push(line);
  }

  return (
    <main className="@container flex h-dvh flex-col overflow-hidden bg-fd-background px-4 py-5 text-fd-foreground sm:px-6 sm:py-6">
      <div className="grid min-h-0 flex-1 items-start gap-6 @2xl:grid-cols-2">
        <div className="min-w-0 @max-2xl:hidden">
          <ServerCodeBlock
            lang="tsx"
            code={definition.trimEnd()}
            codeblock={{ title: 'client.story.tsx' }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <story.WithControl />
          <div className="@max-sm:hidden">
            <ServerCodeBlock
              lang="mdx"
              code={usage.join('\n\n')}
              codeblock={{ title: 'index.mdx' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
