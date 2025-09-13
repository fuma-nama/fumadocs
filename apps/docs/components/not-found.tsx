import { OramaClient } from '@oramacloud/client';
import Link from 'fumadocs-core/link';
import { Suspense } from 'react';
import { cn } from '@/lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

const client = new OramaClient({
  endpoint: 'https://cloud.orama.run/v1/indexes/docs-fk97oe',
  api_key: 'oPZjdlFbq5BpR54bV5Vj57RYt83Xosk7',
});

export function NotFound({ slug }: { slug: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 flex-1 p-8 me-(--fd-toc-width)">
      <h1 className="text-4xl font-bold font-mono">Not Found</h1>
      <div className="w-full border border-fd-foreground/50 border-dashed p-4 max-w-[400px]">
        <Suspense
          fallback={<p className="font-medium">Finding Alternatives...</p>}
        >
          <Alternative term={slug.join(' ')} />
        </Suspense>
      </div>
    </div>
  );
}

async function Alternative({ term }: { term: string }) {
  const result = await client.search({
    term,
    mode: 'vector',
    groupBy: {
      properties: ['url'],
      maxResult: 1,
    },
  });

  if (!result.groups || result.groups.length === 0) {
    return (
      <div>
        <p className="font-medium mb-2">No Alternative Found</p>
        <Link href="/" className={cn(buttonVariants({ variant: 'secondary' }))}>
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-medium mb-4">Maybe you are looking for</h2>

      <div className="flex flex-col gap-2">
        {result.groups.map((group) => {
          const doc = group.result[0];

          return (
            <Link
              key={doc.id}
              href={doc.document.url}
              className="block text-sm p-3 rounded-lg border bg-fd-card text-fd-card-foreground shadow-md transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <p className="font-medium">{doc.document.title}</p>
              <p className="text-fd-muted-foreground">{doc.document.url}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
