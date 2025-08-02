import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import {
  Children,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  Suspense,
  use,
  useDeferredValue,
} from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import defaultMdxComponents from 'fumadocs-ui/mdx';

export interface Processor {
  process: (content: string) => Promise<ReactNode>;
}

function createProcessor(): Processor {
  const processor = remark().use(remarkGfm).use(remarkRehype);

  return {
    async process(content) {
      const nodes = processor.parse({ value: content });
      const hast = await processor.run(nodes);

      return toJsxRuntime(hast, {
        development: false,
        jsx,
        jsxs,
        Fragment,
        components: {
          ...defaultMdxComponents,
          pre: Pre,
          img: undefined, // use JSX
        },
      });
    },
  };
}

function Pre(props: ComponentProps<'pre'>) {
  const code = Children.only(props.children) as ReactElement;
  const codeProps = code.props as ComponentProps<'code'>;

  let lang =
    codeProps.className
      ?.split(' ')
      .find((v) => v.startsWith('language-'))
      ?.slice('language-'.length) ?? 'text';

  if (lang === 'mdx') lang = 'md';

  return (
    <DynamicCodeBlock lang={lang} code={(codeProps.children ?? '') as string} />
  );
}

const processor = createProcessor();

export function Markdown({ text }: { text: string }) {
  const deferredText = useDeferredValue(text);

  return (
    <Suspense fallback={text}>
      <Renderer text={deferredText} />
    </Suspense>
  );
}

const cache = new Map<string, Promise<ReactNode>>();

function Renderer({ text }: { text: string }) {
  const result = cache.get(text) ?? processor.process(text);
  cache.set(text, result);

  return use(result);
}
