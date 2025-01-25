import type { HTMLAttributes, ReactNode } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { cn } from 'fumadocs-ui/components/api';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronDown } from 'lucide-react';

export function CollapsiblePanel({
  title,
  children,
  innerClassName,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  innerClassName?: string;
}) {
  return (
    <Collapsible {...props}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'outline', size: 'sm' }),
          'group rounded-full px-2 py-1.5 text-fd-muted-foreground',
        )}
      >
        {title}
        <ChevronDown className="size-4 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mx-2 -mb-2">
        <div className={cn('flex flex-col gap-4 p-2', innerClassName)}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
