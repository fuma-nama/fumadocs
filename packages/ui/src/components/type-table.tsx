'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { type ReactNode } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface TypeNode {
  /**
   * Additional description of the field
   */
  description?: ReactNode;

  /**
   * type signature (short)
   */
  type: ReactNode;

  /**
   * type signature (full)
   */
  typeDescription?: ReactNode;

  /**
   * Optional `href` for the type
   */
  typeDescriptionLink?: string;

  default?: ReactNode;

  required?: boolean;
  deprecated?: boolean;
}

const keyVariants = cva('text-fd-primary', {
  variants: {
    deprecated: {
      true: 'line-through text-fd-primary/50',
    },
  },
});

export function TypeTable({ type }: { type: Record<string, TypeNode> }) {
  return (
    <div className="@container flex flex-col p-1 bg-fd-card text-fd-card-foreground rounded-2xl border my-6 text-sm overflow-hidden">
      <div className="flex flex-row font-medium items-center px-4 py-1 not-prose text-fd-muted-foreground">
        <p className="w-[25%]">Prop</p>
        <p className="@max-xl:hidden">Type</p>
      </div>
      {Object.entries(type).map(([key, value]) => (
        <Item key={key} name={key} item={value} />
      ))}
    </div>
  );
}

function Item({ name, item }: { name: string; item: TypeNode }) {
  return (
    <Collapsible className="rounded-xl border shadow-sm overflow-hidden transition-all data-[state=open]:bg-fd-muted data-[state=closed]:border-transparent not-last:data-[state=open]:mb-4">
      <CollapsibleTrigger className="relative flex flex-row items-center w-full group text-start px-3 py-2 not-prose hover:bg-fd-accent">
        <span className="pe-2 min-w-fit font-medium w-[25%]">
          <code
            className={cn(
              keyVariants({
                deprecated: item.deprecated,
              }),
            )}
          >
            {name}
            {!item.required && '?'}
          </code>
        </span>
        {item.typeDescriptionLink ? (
          <Link
            href={item.typeDescriptionLink}
            className="underline @max-xl:hidden"
          >
            {item.type}
          </Link>
        ) : (
          <span className="@max-xl:hidden">{item.type}</span>
        )}
        <ChevronDown className="absolute end-2 size-4 text-fd-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 gap-y-4 text-sm p-3 overflow-auto fd-scroll-container prose-no-margin @xl:grid-cols-[1fr_3fr]">
          {item.description && (
            <>
              <p className="text-fd-muted-foreground font-medium not-prose">
                Description
              </p>
              <div className="text-sm my-auto prose">{item.description}</div>
            </>
          )}
          {item.typeDescription && (
            <>
              <p className="text-fd-muted-foreground font-medium not-prose">
                Type
              </p>
              <p className="my-auto not-prose">{item.typeDescription}</p>
            </>
          )}
          {item.default && (
            <>
              <p className="text-fd-muted-foreground font-medium not-prose">
                Default
              </p>
              <p className="my-auto not-prose">{item.default}</p>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
