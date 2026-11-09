import { slug } from 'github-slugger';

/** the key of `hProperties` with the code of an ID, rehype-toc renders it into the heading */
export const idCodeProperty = '_idCode';

/** the runtime of ID code, function bodies read it from `arguments[0]` like the JSX runtime */
export const headingRuntime = 'fumadocs-core/mdx-plugins/remark-heading.runtime';
export const headingSlugImport = `import { headingSlug as _headingSlug } from "${headingRuntime}";`;

interface HeadingNode {
  type: string;
  value?: unknown;
  children?: readonly HeadingNode[];
}

/** the code of the ID of a heading with authored expressions, slugs map characters so its parts are slugged apart */
export function idCode(nodes: readonly HeadingNode[]): string | undefined {
  let code = '';
  let dynamic = false;
  const visit = (nodes: readonly HeadingNode[]) => {
    for (const node of nodes) {
      if (node.type === 'mdxTextExpression') {
        dynamic = true;
        code += ` + _headingSlug(${node.value}\n)`;
      } else if (node.children) visit(node.children);
      else if (typeof node.value === 'string') code += ` + ${JSON.stringify(slug(node.value))}`;
    }
  };
  visit(nodes);
  if (dynamic) return code.slice(3);
}
