import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs.unstyled';
import { CodeBlock } from '@/components/code-block';

export function Installation({ name }: { name: string }) {
  const tabs = [
    { name: 'Fumadocs CLI', value: 'fumadocs-cli' },
    { name: 'Shadcn CLI', value: 'shadcn' },
  ];

  return (
    <Tabs className="my-6">
      <TabsList className="flex flex-col gap-3 text-sm items-start p-3 bg-fd-card text-fd-card-foreground rounded-xl border not-prose sm:flex-row">
        <div className="me-auto">
          <p className="font-medium">Install to your codebase</p>
          <p className="mt-1 text-fd-muted-foreground">
            Easier customisation & control.
          </p>
        </div>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="font-medium text-fd-muted-foreground transition-colors data-[state=active]:text-fd-primary"
          >
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="fumadocs-cli">
        <CodeBlock code={`npx @fumadocs/cli@latest add ${name}`} lang="bash" />
      </TabsContent>

      <TabsContent value="shadcn">
        <CodeBlock
          code={`npx shadcn@latest add https://fumadocs.dev/r/${name}.json`}
          lang="bash"
        />
      </TabsContent>
    </Tabs>
  );
}
