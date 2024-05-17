'use client';

import { ChevronDown } from 'lucide-react';
import type { TOCItemType } from '@maximai/fumadocs-core/server';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

export interface InlineTocProps {
  items: TOCItemType[];
  defaultOpen?: boolean;
}

export function InlineTOC({
  items,
  defaultOpen,
}: InlineTocProps): React.ReactElement {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="not-prose rounded-lg border bg-card text-card-foreground"
    >
      <CollapsibleTrigger className="inline-flex w-full items-center justify-between p-4 font-medium [&[data-state=open]>svg]:rotate-180">
        Table of Contents
        <ChevronDown className="size-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col p-4 pt-0 text-sm text-muted-foreground">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              className="border-l py-1.5 hover:text-accent-foreground"
              style={{
                paddingLeft: 12 * Math.max(item.depth - 1, 0),
              }}
            >
              {item.title}
            </a>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
