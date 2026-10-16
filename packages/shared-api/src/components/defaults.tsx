'use client';
import {
  Children,
  type ComponentProps,
  type FC,
  type ReactElement,
  type ReactNode,
  useMemo,
} from 'react';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Heading } from 'fumadocs-ui/components/heading';
import {
  DynamicCodeBlock,
  type DynamicCodeblockProps,
} from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { BundledTheme, CodeOptionsThemes, CodeToHastOptionsCommon } from 'shiki';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;
export type ShikiOptions = Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

export const defaultShikiOptions: ShikiOptions = {
  themes: { light: 'github-light', dark: 'github-dark' },
};

/** components an API page renders its content through */
export interface PageComponents {
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

/**
 * The default Markdown, code block and heading components of API pages.
 *
 * Markdown is rendered with Remark, its code blocks go through {@link PageComponents}.
 */
export function createPageComponents({
  shiki,
  shikiOptions = defaultShikiOptions,
  components,
}: {
  shiki: ShikiFactory;
  shikiOptions?: ShikiOptions;
  /** replace the default components */
  components: Partial<PageComponents>;
}): PageComponents {
  const CodeBlock =
    components.CodeBlock ??
    ((props: CodeBlockProps) => (
      <DynamicCodeBlock highlighter={() => shiki.getOrInit()} options={shikiOptions} {...props} />
    ));

  let render: ReturnType<typeof createRenderer>;

  return {
    CodeBlock,
    Markdown:
      components.Markdown ??
      (({ md }) =>
        useMemo(() => {
          render ??= createRenderer(CodeBlock);

          return render(md);
        }, [md])),
    Heading:
      components.Heading ??
      (({ depth, ...props }) => <Heading as={`h${depth}` as 'h1'} {...props} />),
  };
}

function createRenderer(CodeBlock: FC<CodeBlockProps>) {
  function Pre(props: ComponentProps<'pre'>) {
    const code = Children.only(props.children) as ReactElement;
    const codeProps = code.props as ComponentProps<'code'>;
    const content = codeProps.children;
    if (typeof content !== 'string') return null;

    const lang =
      codeProps.className
        ?.split(' ')
        .find((v) => v.startsWith('language-'))
        ?.slice('language-'.length) ?? 'text';

    return <CodeBlock lang={lang} code={content.trimEnd()} />;
  }

  const options = {
    ...JsxRuntime,
    components: { ...defaultMdxComponents, img: 'img', pre: Pre },
  };
  const processor = remark().use(remarkGfm).use(remarkRehype);

  return (md: string): ReactNode => toJsxRuntime(processor.runSync(processor.parse(md)), options);
}
