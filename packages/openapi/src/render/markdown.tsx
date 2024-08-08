import { createElement, type ReactElement } from 'react';
import { createProcessor } from '@mdx-js/mdx';
import { rehypeCode, remarkGfm } from 'fumadocs-core/mdx-plugins';
import defaultMdxComponents from 'fumadocs-ui/mdx';

const processor = createProcessor({
  remarkPlugins: [remarkGfm],
  rehypePlugins: [rehypeCode],
  outputFormat: 'function-body',
  development: process.env.NODE_ENV === 'development',
});

export async function Markdown({
  text,
}: {
  text: string;
}): Promise<ReactElement> {
  const result = await processor.process({ value: text });
  const jsxRuntime =
    process.env.NODE_ENV === 'development'
      ? await import('react/jsx-dev-runtime')
      : await import('react/jsx-runtime');

  const fullScope = {
    opts: jsxRuntime,
  };
  const keys = Object.keys(fullScope);
  const values = Object.values(fullScope);
  const hydrateFn = Reflect.construct(
    Function,
    keys.concat(String(result.value)),
  );

  const rendered = hydrateFn.apply(hydrateFn, values) as {
    default: React.ElementType;
  };

  return createElement(rendered.default, {
    components: defaultMdxComponents,
  });
}
