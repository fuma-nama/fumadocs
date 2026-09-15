'use client';
import type { ComponentProps } from 'react';
import { useComponents } from '@/headless';

export function Heading(props: ComponentProps<'h1'> & { id: string; depth: number }) {
  const { Heading: Comp } = useComponents();

  return <Comp {...props} />;
}
