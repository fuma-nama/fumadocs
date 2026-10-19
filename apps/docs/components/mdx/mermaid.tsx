import { useId } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { render } from 'pele';

export function Mermaid({ chart }: { chart: string }) {
  const id = useId();

  try {
    // also lay out the chart for phones, the container query shows the one that fits
    const wide = render(chart, { idPrefix: id });
    const narrow = render(chart, { idPrefix: `${id}narrow`, maxWidth: 320 });

    if (narrow.width >= wide.width) return <div dangerouslySetInnerHTML={{ __html: wide.svg }} />;

    return (
      <div className="@container">
        <div className="@max-[600px]:hidden" dangerouslySetInnerHTML={{ __html: wide.svg }} />
        <div className="@min-[600px]:hidden" dangerouslySetInnerHTML={{ __html: narrow.svg }} />
      </div>
    );
  } catch {
    return (
      <CodeBlock title="Mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    );
  }
}
