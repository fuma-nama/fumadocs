import type { TableOfContents } from 'fumadocs-core/server';
import Slugger from 'github-slugger';
import parse, { type DOMNode, domToReact } from 'html-react-parser';
import { Heading } from 'fumadocs-ui/components/heading';
import { CodeBlock } from '@/components/code-block';

export function renderFromHtml(content: string) {
  const toc: TableOfContents = [];
  const slugger = new Slugger();

  const node = parse(content, {
    replace(node) {
      if (node.type !== 'tag') return node;

      const heading = /^h(\d)$/.exec(node.name);
      if (heading) {
        const depth = Number(heading[1]);
        const string = stringify(node);
        const id = slugger.slug(string);

        toc.push({
          title: string,
          depth,
          url: `#${id}`,
        });

        return (
          <Heading as={`h${depth}` as 'h1'} id={id}>
            {domToReact(node.children as DOMNode[])}
          </Heading>
        );
      }

      if (node.name === 'pre') {
        return <CodeBlock lang="tsx" code={stringify(node)} />;
      }
    },
  });

  return { node, toc };
}

function stringify(node: DOMNode): string {
  if (node.type === 'text') return node.data;
  if ('children' in node) {
    return node.children
      .map((node) => {
        if (node.type === 'cdata' || node.type === 'root') return;

        return stringify(node);
      })
      .filter(Boolean)
      .join('');
  }

  return '';
}
