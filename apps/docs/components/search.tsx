'use client';

import algo from 'algoliasearch/lite';
import { cva } from 'class-variance-authority';
import type { SharedProps } from 'next-docs-ui/components/dialog/search';
import SearchDialog, {
  AlgoliaContextProvider,
} from 'next-docs-ui/components/dialog/search-algolia';
import { useEffect, useState } from 'react';
import { modes } from '@/utils/modes';
import { cn } from '@/utils/cn';
import { useMode } from '@/app/docs/layout.client';

const itemVariants = cva(
  'rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
      },
    },
  },
);

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX;

if (!appId || !apiKey || !indexName) throw new Error('Algolia credentials');

const client = algo(appId, apiKey);

const index = client.initIndex(indexName);

export default function CustomSearchDialog(props: SharedProps): JSX.Element {
  const defaultTag = useMode() ?? 'headless';
  const [tag, setTag] = useState(defaultTag);

  useEffect(() => {
    setTag(defaultTag);
  }, [defaultTag]);

  return (
    <AlgoliaContextProvider index={index}>
      <SearchDialog
        {...props}
        searchOptions={{
          filters: `tag:${tag}`,
        }}
        footer={
          <div className="flex flex-row items-center gap-1">
            {modes.map((mode) => (
              <button
                key={mode.param}
                className={cn(itemVariants({ active: tag === mode.param }))}
                onClick={() => {
                  setTag(mode.param);
                }}
                type="button"
                tabIndex={-1}
              >
                {mode.name.slice('Next Docs '.length)}
              </button>
            ))}
            <a
              href="https://algolia.com"
              rel="noreferrer noopener"
              className="ml-auto text-xs text-muted-foreground"
            >
              Search powered by Algolia
            </a>
          </div>
        }
      />
    </AlgoliaContextProvider>
  );
}
