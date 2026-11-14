import { asMarkdown } from 'fumadocs-core/server';
import { ServerCodeBlock } from '@/components/server-codeblock';

const command = 'npx @fumadocs/cli@latest customize';

export function Customization() {
  if (asMarkdown())
    return (
      <>
        <p>
          For advanced customization that supported options cannot suffice, install via Fumadocs
          CLI:
        </p>
        <pre>
          <code className="language-bash">{command}</code>
        </pre>
      </>
    );

  return (
    <div className="flex flex-col gap-2 p-3 my-4 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
      <p className="font-medium text-sm">Install via Fumadocs CLI</p>
      <p className="text-fd-muted-foreground text-sm">
        For advanced customization that supported options cannot suffice.
      </p>
      <ServerCodeBlock code={command} lang="bash" />
    </div>
  );
}
