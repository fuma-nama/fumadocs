'use client';
import type { ReactNode } from 'react';
import { Heading } from './heading';

export function SectionHeader({
  id,
  depth,
  title,
}: {
  id: string;
  depth: number;
  title: ReactNode;
}) {
  return (
    <Heading id={id} depth={depth} className="mt-10! mb-3! first:mt-0!">
      {title}
    </Heading>
  );
}
