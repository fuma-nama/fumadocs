import { useMemo } from 'react';
import { useRenderContext } from '../contexts/api';

export function Markdown({ md }: { md: string }) {
  const {
    _default_processMarkdown: processMarkdown,
    renderMarkdown,
    components: { Markdown: Comp } = {},
  } = useRenderContext();
  if (renderMarkdown) return renderMarkdown(md);
  if (Comp) return <Comp md={md} />;

  return useMemo(() => processMarkdown(md), [processMarkdown, md]);
}
