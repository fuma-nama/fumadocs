'use client';

import { useMDXComponent } from 'next-contentlayer/hooks';
import defaultComponents from 'fumadocs-ui/mdx/default-client';

const components = {
  ...defaultComponents,
};

export function Content({ code }: { code: string }) {
  const MDX = useMDXComponent(code);

  return <MDX components={components} />;
}
