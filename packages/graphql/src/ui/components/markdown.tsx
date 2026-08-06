import { useMemo } from 'react';
import { useRenderContext } from '../contexts/api';

export function Markdown({ md }: { md: string }) {
  const { _default_processMarkdown: processMarkdown, components: { Markdown: Comp } = {} } =
    useRenderContext();
  const rendered = useMemo(() => (Comp ? null : processMarkdown(md)), [Comp, processMarkdown, md]);

  if (Comp) return <Comp md={md} />;
  return rendered;
}
