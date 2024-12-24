import type { Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { Literal, Root } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import matter from 'gray-matter';

export function remarkInclude(this: Processor): Transformer<Root, Root> {
  return async (tree, file) => {
    const queue: Promise<void>[] = [];

    visit(tree, ['mdxJsxFlowElement', 'paragraph'] as const, (node) => {
      let specifier: string | undefined;

      // without MDX, parse from paragraph nodes
      if (node.type === 'paragraph' && node.children.length === 3) {
        const [open, content, closure] = node.children;

        if (
          open.type === 'html' &&
          open.value === '<include>' &&
          content.type === 'text' &&
          closure.type === 'html' &&
          closure.value === '</include>'
        ) {
          specifier = content.value.trim();
        }
      }

      if (node.type === 'mdxJsxFlowElement' && node.name === 'include') {
        const child = node.children.at(0) as Literal | undefined;

        if (!child || child.type !== 'text') return;
        specifier = child.value;
      }

      if (!specifier) return 'skip';
      const targetPath = path.resolve(path.dirname(file.path), specifier);

      queue.push(
        fs.readFile(targetPath).then((content) => {
          const parsed = this.parse(matter(content).content);

          if (file.data._compiler) {
            file.data._compiler.addDependency(targetPath);
          }
          Object.assign(node, parsed);
        }),
      );

      return 'skip';
    });

    await Promise.all(queue);
  };
}
