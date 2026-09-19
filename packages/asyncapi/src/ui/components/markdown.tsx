'use client';
import { useComponents } from '@/utils/create-page';

export function Markdown({ md }: { md: string }) {
  const { Markdown: Comp } = useComponents();

  return <Comp md={md} />;
}
