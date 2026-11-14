import { asMarkdown } from 'fumadocs-core/server';
import { ServerCodeBlock } from '@/components/server-codeblock';

export function Installation({ name }: { name: string }) {
  const command = `npx @fumadocs/cli@latest add ${name}`;
  if (asMarkdown())
    return (
      <>
        <p>Install to your codebase:</p>
        <pre>
          <code className="language-bash">{command}</code>
        </pre>
      </>
    );

  return (
    <div className="p-3 border rounded-xl bg-fd-card text-fd-card-foreground my-4! text-sm not-prose">
      <p className="font-medium">Install to your codebase</p>
      <p className="mt-1 mb-4 text-fd-muted-foreground">Easier customization & control.</p>

      <ServerCodeBlock code={command} lang="bash" />
    </div>
  );
}
