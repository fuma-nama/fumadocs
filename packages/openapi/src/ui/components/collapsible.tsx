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
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  children: ReactNode;
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
      <CollapsibleContent className="-mx-2">
        <div className="flex flex-col gap-4 p-2 pb-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
