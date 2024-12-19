'use client';

import { ChevronDown } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { ComponentProps } from 'react';
import { cn } from '@/utils/cn';

export interface InlineTocProps extends ComponentProps<typeof Collapsible> {
  items: TOCItemType[];
}

export function InlineTOC({ items, ...props }: InlineTocProps) {
  return (
    <Collapsible
      {...props}
      className={cn(
        'not-prose rounded-lg border bg-fd-card text-fd-card-foreground',
        props.className,
      )}
    >
      <CollapsibleTrigger className="group inline-flex w-full items-center justify-between px-4 py-2.5 font-medium">
        {props.children ?? 'Table of Contents'}
        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col p-4 pt-0 text-sm text-fd-muted-foreground">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              className="border-s py-1.5 hover:text-fd-accent-foreground"
              style={{
                paddingInlineStart: 12 * Math.max(item.depth - 1, 0),
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
