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

export interface FileProps {
  title: string;
  icon?: ReactNode;
}

export interface FolderProps {
  title: string;

  /**
   * Open folder by default
   *
   * @defaultValue false
   */
  defaultOpen?: boolean;

  /**
   * children files of the folder, considered as file if empty
   */
  children: ReactNode;
}

export function File(props: FileProps | FolderProps): JSX.Element {
  if ('children' in props) {
    return <Folder {...props} />;
  }

  return (
    <p className={cn(item())}>
      {props.icon ?? <FileIcon />}
      {props.title}
    </p>
  );
}

export function Folder({
  title,
  defaultOpen = false,
  children,
}: FolderProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn(item({ className: 'group w-full' }))}>
        <FolderIcon className="group-data-[state=open]:hidden" />
        <FolderOpenIcon className="group-data-[state=closed]:hidden" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 flex flex-col border-l pl-2 pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
