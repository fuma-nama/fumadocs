import { CodeBlock } from '@/components/code-block';

export function Customisation() {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
      <p className="font-medium text-sm">Install via Fumadocs CLI</p>
      <p className="text-fd-muted-foreground text-sm">
        For advanced customisation that supported options cannot suffice.
      </p>
      <CodeBlock
        code="npx @fumadocs/cli@latest customise"
        lang="bash"
        wrapper={{
          className: 'my-0',
        }}
      />
    </div>
  );
}
