'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
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
import type { SchemaUIOptions } from '@/components/schema';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components an API page renders its content through */
export interface PageComponents {
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

export interface CreatePageComponentsOptions {
  /** without it, code blocks render unhighlighted */
  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;
  /** replace the default components */
  components?: Partial<PageComponents>;
}

/**
 * The default Markdown, code block and heading components of API pages.
 *
 * Markdown is rendered with Remark, its code blocks go through {@link PageComponents}.
 */
export function createPageComponents({
  shiki,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  components = {},
}: CreatePageComponentsOptions): {
  components: PageComponents;
  /** render Markdown outside of a component */
  processMarkdown: (md: string) => ReactNode;
  /** {@link SchemaUIOptions} renderers backed by the components */
  renderMarkdown: (md: string) => ReactNode;
  renderCodeblock: SchemaUIOptions['renderCodeblock'];
} {
  const CodeBlock =
    components.CodeBlock ??
    (shiki
      ? (props: CodeBlockProps) => (
          <DynamicCodeBlock
            highlighter={() => shiki.getOrInit()}
            options={shikiOptions}
            {...props}
          />
        )
      : ({ code, lang }: CodeBlockProps) => (
          <pre>
            <code className={`language-${lang}`}>{code}</code>
          </pre>
        ));

  let processor: ReturnType<typeof createProcessor>;
  function processMarkdown(md: string): ReactNode {
    processor ??= createProcessor(CodeBlock);

    return processor.processSync(md).result as ReactNode;
  }

  const Markdown =
    components.Markdown ?? (({ md }: { md: string }) => useMemo(() => processMarkdown(md), [md]));

  return {
    components: {
      Markdown,
      CodeBlock,
      Heading:
        components.Heading ??
        (({ depth, ...props }) => <Heading as={`h${depth}` as 'h1'} {...props} />),
    },
    processMarkdown,
    renderMarkdown: (md) => <Markdown md={md} />,
    renderCodeblock: (props) => <CodeBlock {...props} />,
  };
}

function createProcessor(CodeBlock: FC<CodeBlockProps>) {
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

  const mdxComponents = {
    ...defaultMdxComponents,
    img: undefined,
    pre: Pre,
  };

  function rehypeReact(this: any) {
    this.compiler = (tree: any, file: any) => {
      return toJsxRuntime(tree, {
        development: false,
        filePath: file.path,
        ...JsxRuntime,
        components: mdxComponents,
      });
    };
  }

  return remark().use(remarkGfm).use(remarkRehype).use(rehypeReact);
}
