'use client';

import { ChevronDown } from 'lucide-react';
import type { TOCItemType } from 'next-docs-zeta/server';
import type { ReactNode } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

export interface InlineTocProps {
  items: TOCItemType[];
  defaultOpen?: boolean;
  children?: ReactNode;
}

export function InlineTOC({
  items,
  defaultOpen,
  children,
}: InlineTocProps): JSX.Element {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="not-prose rounded-lg border bg-card text-card-foreground"
    >
      <CollapsibleTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-between p-4 text-medium font-medium [&[data-state=open]>svg]:rotate-180"
          >
            Table of Contents
            <ChevronDown className="size-4 transition-transform duration-200" />
          </button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col px-6 pb-4 text-sm text-muted-foreground">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              className="py-1.5 hover:text-accent-foreground"
              style={{
                paddingLeft: 16 * Math.max(item.depth - 2, 0),
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
