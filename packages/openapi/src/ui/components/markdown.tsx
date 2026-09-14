'use client';
import { useComponents } from '../contexts/api';

export function Markdown({ md }: { md: string }) {
  const { Markdown: Comp } = useComponents();

  return <Comp md={md} />;
}
