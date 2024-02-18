'use client';

import { cva } from 'class-variance-authority';
import { FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

const item = cva(
  'flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground [&_svg]:size-4',
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

export interface FileProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  icon?: ReactNode;
}

export interface FolderProps extends HTMLAttributes<HTMLDivElement> {
  name: string;

  /**
   * Open folder by default
   *
   * @defaultValue false
   */
  defaultOpen?: boolean;
}

export function File({
  name,
  icon = <FileIcon />,
  className,
  ...rest
}: FileProps): JSX.Element {
  return (
    <div className={cn(item({ className }))} {...rest}>
      {icon}
      {name}
    </div>
  );
}

export function Folder({
  name,
  defaultOpen = false,
  ...props
}: FolderProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} {...props}>
      <CollapsibleTrigger className={cn(item({ className: 'w-full' }))}>
        {open ? <FolderOpenIcon /> : <FolderIcon />}
        {name}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-2 flex flex-col border-l pl-2">{props.children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
