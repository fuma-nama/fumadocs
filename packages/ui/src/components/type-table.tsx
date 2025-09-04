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
    <div className="flex flex-col bg-fd-card text-fd-card-foreground rounded-2xl border my-6 text-sm overflow-x-auto">
      <div className="flex flex-row font-medium items-center px-4 py-2 not-prose text-fd-muted-foreground">
        <p className="w-[25%]">Prop</p>
        <p className="flex-1">Type</p>
      </div>
      {Object.entries(type).map(([key, value]) => (
        <Item key={key} name={key} item={value} />
      ))}
    </div>
  );
}

function Item({ name, item }: { name: string; item: TypeNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="relative flex flex-col w-full group text-start px-4 py-2 border-t not-prose transition-colors data-[state=closed]:hover:bg-fd-accent sm:flex-row sm:items-center">
        <span className="w-[25%] pe-2 min-w-fit">
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
          <Link href={item.typeDescriptionLink} className="underline">
            {item.type}
          </Link>
        ) : (
          <span>{item.type}</span>
        )}
        <ChevronDown className="absolute end-2 size-4 text-fd-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="prose rounded-xl border shadow-md bg-fd-muted text-sm mx-2 mb-2 p-2 overflow-auto prose-no-margin">
          {item.typeDescription && (
            <div className="flex flex-row gap-4 not-prose">
              <p className="text-fd-muted-foreground font-medium">Type</p>
              <p className="text-[13px] my-auto">{item.typeDescription}</p>
            </div>
          )}
          {item.description}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
