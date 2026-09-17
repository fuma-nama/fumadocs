'use client';
import { useComponents } from '@/headless';

export function Markdown({ md }: { md: string }) {
  const { Markdown: Comp } = useComponents();

  return <Comp md={md} />;
}
