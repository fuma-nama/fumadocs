'use client';

import type { HTMLAttributes } from 'react';
import * as P from '@/mdx/pre';

export function Pre({
  title,
  allowCopy,
  ...props
}: HTMLAttributes<HTMLPreElement> & { allowCopy?: boolean }): JSX.Element {
  return (
    <P.CodeBlock title={title} allowCopy={allowCopy}>
      <P.Pre {...props} />
    </P.CodeBlock>
  );
}
