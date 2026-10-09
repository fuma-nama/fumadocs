'use client';
import { CodeBlock, Pre as CodePre } from 'fumadocs-ui/components/codeblock';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { Element, ElementContent, Root } from 'hast';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { type ComponentProps, memo, useState } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import remend from 'remend';

const processor = remark().use(remarkGfm).use(remarkRehype);
const streamProcessor = remark().use(remarkGfm).use(remarkRehype).use(rehypeWords);

const components: Components = {
  ...defaultMdxComponents,
  pre: Pre,
  img: 'img',
};
// code is highlighted once its block settles
const liveComponents: Components = { ...components, pre: LivePre };

/**
 * An answer in Markdown. While `live`, only its last block re-renders, with unclosed syntax completed.
 */
export function Markdown({ text, live }: { text: string; live: boolean }) {
  const blocks = splitBlocks(text);

  return (
    <div className="prose prose-no-margin text-sm">
      {blocks.map((block, i) => (
        <Block
          key={i}
          text={live && i === blocks.length - 1 ? remend(block, { linkMode: 'text-only' }) : block}
          live={live && i === blocks.length - 1}
        />
      ))}
    </div>
  );
}

const Block = memo(function Block({ text, live }: { text: string; live: boolean }) {
  // only words that stream in fade, a chat from history renders plain text
  const [streamed] = useState(live);
  const p = streamed ? streamProcessor : processor;

  return toJsxRuntime(p.runSync(p.parse(text)), {
    development: false,
    Fragment,
    jsx,
    jsxs,
    components: live ? liveComponents : components,
  });
});

const listItem = /^(?:[-*+]|\d{1,9}[.)])\s/;

/** top-level blocks split at blank lines, a block continues through code fences, indented lines and list items */
export function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let block = '';
  let fence: string | undefined;
  let blank = false;
  let inList = false;

  for (const line of text.split('\n')) {
    if (fence) {
      block += `\n${line}`;
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = undefined;
      continue;
    }

    if (line.trim().length === 0) {
      blank = true;
      continue;
    }

    const indented = /^\s/.test(line);
    if (block.length === 0) {
      block = line;
    } else if (blank && !indented && !(inList && listItem.test(line))) {
      blocks.push(block);
      block = line;
    } else {
      block += blank ? `\n\n${line}` : `\n${line}`;
    }

    if (!indented) inList = listItem.test(line);
    blank = false;
    fence = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
  }

  if (block.length > 0) blocks.push(block);
  return blocks;
}

function Pre({ children }: ComponentProps<'pre'>) {
  const code = codeOf(children);
  if (!code) return null;
  const lang = /language-(\S+)/.exec(code.className ?? '')?.[1] ?? 'text';

  return <DynamicCodeBlock lang={lang === 'mdx' ? 'md' : lang} code={code.children.trimEnd()} />;
}

function LivePre({ children }: ComponentProps<'pre'>) {
  const code = codeOf(children);
  if (!code) return null;

  return (
    <CodeBlock className="my-0">
      <CodePre>
        <code>{code.children.trimEnd()}</code>
      </CodePre>
    </CodeBlock>
  );
}

function codeOf(children: unknown) {
  const props = (children as { props?: ComponentProps<'code'> } | undefined)?.props;
  if (typeof props?.children === 'string') return props as { children: string; className?: string };
}

function rehypeWords() {
  const split = (parent: Root | Element) => {
    for (let i = 0; i < parent.children.length; i++) {
      const node = parent.children[i];
      if (node.type === 'element' && node.tagName !== 'pre') split(node);
      if (node.type !== 'text') continue;

      const words: ElementContent[] = [];
      for (const word of node.value.split(/(?=\s)/)) {
        if (word.length === 0) continue;
        words.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['motion-safe:animate-fd-fade-in'] },
          children: [{ type: 'text', value: word }],
        });
      }

      parent.children.splice(i, 1, ...words);
      i += words.length - 1;
    }
  };

  return (tree: Root) => split(tree);
}
