'use client';
import type { ReactNode } from 'react';
import { Heading } from './heading';

export function SectionHeader({
  id,
  depth,
  title,
  children,
}: {
  id: string;
  depth: number;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mt-10 mb-3 flex flex-wrap items-center gap-2 first:mt-0">
      <Heading id={id} depth={depth} className="my-0!">
        {title}
      </Heading>
      <div className="ms-auto flex min-w-0 items-center">{children}</div>
    </div>
  );
}
