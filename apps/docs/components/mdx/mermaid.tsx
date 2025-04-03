'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { MermaidConfig } from 'mermaid';
import { useTheme } from 'next-themes';

export function Mermaid({ chart }: { chart: string }) {
  const id = useId();
  const [svg, setSvg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null!);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    void renderChart();

    async function renderChart() {
      const mermaidConfig: MermaidConfig = {
        startOnLoad: false,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        themeCSS: 'margin: 1.5rem auto 0;',
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      };

      const { default: mermaid } = await import('mermaid');

      try {
        mermaid.initialize(mermaidConfig);
        const { svg } = await mermaid.render(
          // strip invalid characters for `id` attribute
          id.replaceAll(':', ''),
          chart.replaceAll('\\n', '\n'),
          containerRef.current,
        );
        setSvg(svg);
      } catch (error) {
        console.error('Error while rendering mermaid', error);
      }
    }
  }, [chart, id, resolvedTheme]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} />;
}
