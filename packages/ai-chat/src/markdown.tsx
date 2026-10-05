'use client';
import { cn } from 'cn';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { ElementContent, Root } from 'hast';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { type ComponentProps, memo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import remend from 'remend';
import { visit } from 'unist-util-visit';
import { splitBlocks } from './utils/blocks';

const processor = remark().use(remarkGfm).use(remarkRehype).use(rehypeWords);

const components: Components = {
  ...defaultMdxComponents,
  pre: Pre,
  img: 'img',
};

/**
 * An answer in Markdown. While `live`, only its last block re-renders, with unclosed syntax completed.
 */
export function ChatMarkdown({
  text,
  live = false,
  className,
  ...props
}: ComponentProps<'div'> & { text: string; live?: boolean }) {
  const blocks = splitBlocks(text);

  return (
    <div className={cn('prose prose-no-margin text-sm', className)} {...props}>
      {blocks.map((block, i) => (
        <Block
          key={i}
          text={live && i === blocks.length - 1 ? remend(block, { linkMode: 'text-only' }) : block}
        />
      ))}
    </div>
  );
}

const Block = memo(function Block({ text }: { text: string }) {
  return toJsxRuntime(processor.runSync(processor.parse(text)), {
    development: false,
    Fragment,
    jsx,
    jsxs,
    components,
  });
});

function Pre({ children }: ComponentProps<'pre'>) {
  const code = (children as { props?: ComponentProps<'code'> } | undefined)?.props;
  if (typeof code?.children !== 'string') return null;
  const lang = /language-(\S+)/.exec(code.className ?? '')?.[1] ?? 'text';

  return <DynamicCodeBlock lang={lang === 'mdx' ? 'md' : lang} code={code.children.trimEnd()} />;
}

/** each word fades in as it streams */
function rehypeWords() {
  return (tree: Root) => {
    visit(tree, ['text', 'element'], (node, index, parent) => {
      if (node.type === 'element' && node.tagName === 'pre') return 'skip';
      if (node.type !== 'text' || !parent || index === undefined) return;

      const words: ElementContent[] = [];
      for (const word of node.value.split(/(?=\s)/)) {
        if (word.length === 0) continue;
        words.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['animate-fd-fade-in'] },
          children: [{ type: 'text', value: word }],
        });
      }

      parent.children.splice(index, 1, ...words);
      return index + words.length;
    });
  };
}
