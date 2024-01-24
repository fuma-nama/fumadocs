'use client';

import type { HTMLAttributes } from 'react';
import * as Base from '@/components/codeblock';

export function Pre({
  title,
  allowCopy,
  ...props
}: HTMLAttributes<HTMLPreElement> & { allowCopy?: boolean }): JSX.Element {
  return (
    <Base.CodeBlock title={title} allowCopy={allowCopy}>
      <Base.Pre {...props} />
    </Base.CodeBlock>
  );
}
