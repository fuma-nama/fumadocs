'use client';

import { cva } from 'class-variance-authority';
import { FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

const item = cva(
  'flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:h-4 [&_svg]:w-4',
);

export function Files({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('not-prose rounded-md border bg-card p-2', className)}
      {...props}
    >
      {props.children}
    </div>
  );
}

interface FileProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
}

export function File({
  title,
  icon,
  defaultOpen,
  children,
}: FileProps): JSX.Element {
  if (!children) {
    return (
      <p className={cn(item())}>
        {icon ?? <FileIcon />}
        {title}
      </p>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className={cn(item({ className: 'group w-full' }))}>
        <FolderIcon className="group-data-[state=open]:hidden" />
        <FolderOpenIcon className="group-data-[state=closed]:hidden" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 flex flex-col border-l py-2 pl-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
