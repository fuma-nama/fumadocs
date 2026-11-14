import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as radix from '../src/components/codeblock';
import * as base from '@fumadocs/base-ui/components/codeblock';

test.each([
  ['Radix UI', radix],
  ['Base UI', base],
] as const)(
  '%s: code blocks are focusable without being unnamed region landmarks',
  (_, { CodeBlock, Pre }) => {
    const html = renderToStaticMarkup(
      <>
        <CodeBlock title="source.config.ts">
          <Pre>a</Pre>
        </CodeBlock>
        <CodeBlock>
          <Pre>b</Pre>
        </CodeBlock>
      </>,
    );

    expect(html).not.toContain('role="region"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
  },
);
