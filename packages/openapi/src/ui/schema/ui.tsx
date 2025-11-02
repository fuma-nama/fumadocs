import type { ReactNode } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { cn } from 'fumadocs-ui/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronDown } from 'fumadocs-ui/internal/icons';
import { Badge } from '@/ui/components/method-label';

export function ObjectCollapsible(props: {
  name: string;
  children: ReactNode;
}) {
  return (
    <Collapsible className="my-2" {...props}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'secondary', size: 'sm' }),
          'group px-3 py-2 data-[state=open]:rounded-b-none',
        )}
      >
        {props.name}
        <ChevronDown className="size-4 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mt-px *:bg-fd-card">
        {props.children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export interface PropertyProps {
  name: ReactNode;
  type: ReactNode;
  required?: boolean;
  deprecated?: boolean;
  nested?: boolean;

  children?: ReactNode;
  className?: string;
}

export function Property({
  name,
  type,
  required,
  deprecated,
  nested = false,
  ...props
}: PropertyProps) {
  return (
    <div
      className={cn(
        'text-sm border-t',
        nested
          ? 'p-3 border-x bg-fd-card last:rounded-b-xl first:rounded-tr-xl last:border-b'
          : 'py-4 first:border-t-0',
        props.className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">
          {name}
          {required === false && (
            <span className="text-fd-muted-foreground">?</span>
          )}
        </span>
        {typeof type === 'string' ? (
          <span className="text-sm font-mono text-fd-muted-foreground">
            {type}
          </span>
        ) : (
          type
        )}
        {deprecated && (
          <Badge color="yellow" className="ms-auto text-xs">
            Deprecated
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">
        {props.children}
      </div>
    </div>
  );
}
