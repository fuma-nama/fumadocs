import { and } from './code-output';

/** the key of `hProperties` with the code of an ID, rehype-toc renders it into the heading */
export const idCodeProperty = '_idCode';

/** the runtime of ID code, function bodies read it from `arguments[0]` like the JSX runtime */
export const headingRuntime = 'fumadocs-core/mdx-plugins/remark-heading.runtime';

interface HeadingNode {
  type: string;
  value?: unknown;
  children?: readonly HeadingNode[];
}

/**
 * IDs slugged when rendering, from the first heading with an authored expression or in a branch of `<show>`: only the
 * headings that show count for duplicates.
 */
export function headingIdCode() {
  const entries: string[] = [];
  let dynamic = false;

  return {
    /** the code of the ID of the next heading in document order, when it renders from code */
    next(nodes: readonly HeadingNode[], when: string[]): string | undefined {
      let parts = '';
      const visit = (nodes: readonly HeadingNode[]) => {
        for (const node of nodes) {
          if (node.type === 'mdxTextExpression') {
            dynamic = true;
            parts += `(${node.value}\n),`;
          } else if (node.children) visit(node.children);
          else if (typeof node.value === 'string') parts += `${JSON.stringify(node.value)},`;
        }
      };
      visit(nodes);
      const test = and(when);
      if (test) dynamic = true;
      entries.push(`(props) => ${test ? `${test} ? [${parts}] : null` : `[${parts}]`}`);
      if (dynamic) return `_headingIds(props)[${entries.length - 1}]`;
    },
    get esm(): string | undefined {
      if (dynamic)
        return `import { createHeadingIds as _createHeadingIds } from "${headingRuntime}";\nexport const _headingIds = _createHeadingIds([${entries.join(', ')}]);`;
    },
  };
}
