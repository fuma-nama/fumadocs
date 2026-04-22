import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';

export function Installation({ name }: { name: string }) {
  return (
    <div className="p-3 border rounded-xl bg-fd-card text-fd-card-foreground my-6 text-sm not-prose">
      <p className="font-medium">Install to your codebase</p>
      <p className="mt-1 mb-4 text-fd-muted-foreground">Easier customization & control.</p>

      <ServerCodeBlock code={`npx @fumadocs/cli@latest add ${name}`} lang="bash" />
    </div>
  );
}
