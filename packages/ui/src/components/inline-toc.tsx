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
      className="not-prose rounded-lg border bg-card text-sm text-card-foreground"
    >
      <CollapsibleTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-between p-4 font-medium [&[data-state=open]>svg]:rotate-180"
          >
            Table of Contents
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col px-4 pb-4 text-muted-foreground">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              className="border-l py-1.5 hover:border-primary hover:text-primary"
              style={{
                paddingLeft: 16 * Math.max(item.depth - 1, 1),
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
