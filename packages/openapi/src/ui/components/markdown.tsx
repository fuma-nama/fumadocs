import { type ReactNode, useMemo } from 'react';
import { useRenderContext } from '../contexts/api';

export function Markdown({ md }: { md: string }) {
  const processor = useRenderContext()._getMarkdownProcessor();

  return useMemo(() => processor.processSync(md) as unknown as ReactNode, [processor, md]);
}
