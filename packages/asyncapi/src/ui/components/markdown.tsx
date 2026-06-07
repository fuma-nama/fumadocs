import { useMemo } from 'react';
import { useRenderContext } from '../contexts/api';

export function Markdown({ md }: { md: string }) {
  const { _default_processMarkdown: processMarkdown } = useRenderContext();

  return useMemo(() => processMarkdown(md), [processMarkdown, md]);
}
