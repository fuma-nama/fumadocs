'use client';

import * as Base from '@/components/codeblock';

export function Pre({
  title,
  allowCopy,
  icon,
  ...props
}: Base.CodeBlockProps): JSX.Element {
  return (
    <Base.CodeBlock title={title} allowCopy={allowCopy} icon={icon}>
      <Base.Pre {...props} />
    </Base.CodeBlock>
  );
}
